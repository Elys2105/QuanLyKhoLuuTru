import {
  head,
  issueSignedToken,
  presignUrl,
} from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_BASE =
  "https://qlklt-v414-ohokt70at-chaunguyen22012005-6505s-projects.vercel.app";

const ROUTE_PROOF = "V05B";
const SIGNED_URL_TTL_MS = 5 * 60 * 1000;

type DigitalFileMeta = {
  id?: number | string;
  original_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  is_deleted?: boolean | null;
};

type Action = "preview" | "download";

function backendBase(): string {
  return (
    process.env.QLKLT_BACKEND_BASE_URL ||
    DEFAULT_BACKEND_BASE
  ).replace(/\/+$/, "");
}

function blobReadWriteToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not configured for this production runtime.",
    );
  }

  return token;
}

function normalizedExtension(name?: string | null): string {
  const value = String(name || "").trim();
  const match = value.match(/(\.[A-Za-z0-9]{1,10})$/);

  return match ? match[1].toLowerCase() : "";
}

function pathnameForDigitalFile(
  id: string,
  originalName?: string | null,
): string {
  const extension = normalizedExtension(originalName);

  return `digital-files/${encodeURIComponent(id)}/source${extension}`;
}

function jsonError(message: string, status: number) {
  const response = NextResponse.json(
    {
      detail: message,
      storage_route: ROUTE_PROOF,
    },
    { status },
  );

  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-QLKLT-Blob-Route", ROUTE_PROOF);

  return response;
}

async function loadAuthorizedMetadata(
  request: NextRequest,
  id: string,
): Promise<
  | { meta: DigitalFileMeta; response?: never }
  | { meta?: never; response: NextResponse }
> {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return {
      response: jsonError("Authentication required.", 401),
    };
  }

  const upstream = await fetch(
    `${backendBase()}/api/digital-files/${encodeURIComponent(id)}/`,
    {
      method: "GET",
      headers: {
        Authorization: authorization,
        Accept: "application/json",
      },
      cache: "no-store",
      redirect: "manual",
    },
  );

  if (!upstream.ok) {
    const body = await upstream.text();

    const response = new NextResponse(body || "Upstream authorization failed.", {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ||
          "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-QLKLT-Blob-Route": ROUTE_PROOF,
      },
    });

    return { response };
  }

  const payload = (await upstream.json()) as
    | DigitalFileMeta
    | {
        data?: DigitalFileMeta | null;
      };

  const meta =
    "data" in payload && payload.data
      ? payload.data
      : (payload as DigitalFileMeta);

  if (meta?.is_deleted === true) {
    return {
      response: jsonError("Digital file is deleted.", 404),
    };
  }

  return { meta };
}

export async function signedDigitalFileRedirect(
  request: NextRequest,
  id: string,
  action: Action,
): Promise<NextResponse> {
  if (!/^\d+$/.test(id)) {
    return jsonError("Invalid digital file id.", 400);
  }

  const authorized = await loadAuthorizedMetadata(
    request,
    id,
  );

  if (authorized.response) {
    return authorized.response;
  }

  const meta = authorized.meta;
  const pathname = pathnameForDigitalFile(
    id,
    meta.original_name,
  );

  if (
    action === "preview" &&
    normalizedExtension(meta.original_name) !== ".pdf"
  ) {
    return jsonError(
      "Inline preview is currently supported for PDF files only.",
      400,
    );
  }

  let blobDetails;

  try {
    blobDetails = await head(pathname, {
      token: blobReadWriteToken(),
    });
  } catch {
    return jsonError(
      "Online file content was not found in private storage.",
      404,
    );
  }

  if (
    typeof meta.file_size === "number" &&
    meta.file_size > 0 &&
    blobDetails.size !== meta.file_size
  ) {
    return jsonError(
      "Online file size does not match database metadata.",
      409,
    );
  }

  const validUntil = Date.now() + SIGNED_URL_TTL_MS;

  const signedToken = await issueSignedToken({
    pathname,
    operations: ["get"],
    validUntil,
    token: blobReadWriteToken(),
  });

  const { presignedUrl } = await presignUrl(
    signedToken,
    {
      pathname,
      operation: "get",
      access: "private",
      validUntil,
    },
  );

  const response = NextResponse.redirect(
    presignedUrl,
    307,
  );

  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-QLKLT-Blob-Route", ROUTE_PROOF);
  response.headers.set(
    "X-QLKLT-Blob-Action",
    action,
  );

  return response;
}