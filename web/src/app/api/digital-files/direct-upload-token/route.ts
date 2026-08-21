import {
  issueSignedToken,
  presignUrl,
} from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_BASE = "https://qlklt-v414-he3f3zfz5-chaunguyen22012005-6505s-projects.vercel.app";
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const PUT_TTL_MS = 30 * 60 * 1000;

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

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
      "BLOB_READ_WRITE_TOKEN is not configured.",
    );
  }

  return token;
}

function jsonError(message: string, status: number) {
  const response = NextResponse.json(
    {
      success: false,
      message,
      storage_route: "V05C-PUT-R13",
    },
    { status },
  );

  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-QLKLT-Upload-Route", "V05C-PUT-R13");

  return response;
}

function extensionOf(name: string): string {
  const match = String(name || "").match(
    /(\.[A-Za-z0-9]{1,10})$/,
  );

  return match ? match[1].toLowerCase() : "";
}

type BackendAuthorizeResponse = {
  success?: boolean;
  data?: {
    blob_path?: string;
    registration_ticket?: string;
    mime_type?: string;
  };
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return jsonError("Authentication required.", 401);
  }

  let body: {
    profile?: string | number;
    document?: string | number | null;
    original_name?: string;
    file_size?: number;
    mime_type?: string;
    is_primary?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const originalName = String(body.original_name || "").trim();
  const fileSize = Number(body.file_size || 0);
  const extension = extensionOf(originalName);
  const contentType = CONTENT_TYPES[extension];

  if (!contentType) {
    return jsonError(
      "Only PDF, Word and Excel files are supported.",
      400,
    );
  }

  if (
    !Number.isSafeInteger(fileSize) ||
    fileSize <= 0 ||
    fileSize > MAX_FILE_SIZE
  ) {
    return jsonError("Invalid file size.", 400);
  }

  const authorizeResponse = await fetch(
    `${backendBase()}/api/digital-files/direct-upload-authorize/`,
    {
      method: "POST",
      headers: {
        Authorization: authorization,
        Accept: "application/json",
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        profile: body.profile,
        document: body.document ?? null,
        original_name: originalName,
        file_size: fileSize,
        mime_type: contentType,
        is_primary: Boolean(body.is_primary),
      }),
      cache: "no-store",
      redirect: "manual",
    },
  );

  const authorizeText = await authorizeResponse.text();

  if (!authorizeResponse.ok) {
    return new NextResponse(
      authorizeText || "Upload authorization failed.",
      {
        status: authorizeResponse.status,
        headers: {
          "Content-Type":
            authorizeResponse.headers.get("content-type") ||
            "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "X-QLKLT-Upload-Route": "V05C-PUT-R13",
        },
      },
    );
  }

  let authorizePayload: BackendAuthorizeResponse;

  try {
    authorizePayload = JSON.parse(
      authorizeText,
    ) as BackendAuthorizeResponse;
  } catch {
    return jsonError(
      "Backend authorization returned invalid JSON.",
      502,
    );
  }

  const pathname = String(
    authorizePayload.data?.blob_path || "",
  )
    .trim()
    .replace(/^\/+/, "");

  const registrationTicket = String(
    authorizePayload.data?.registration_ticket || "",
  ).trim();

  if (
    !pathname.startsWith("digital-files/uploads/") ||
    !registrationTicket
  ) {
    return jsonError(
      "Backend authorization returned incomplete upload grant.",
      502,
    );
  }

  const validUntil = Date.now() + PUT_TTL_MS;

  const signedToken = await issueSignedToken({
    pathname,
    operations: ["put"],
    validUntil,
    allowedContentTypes: [contentType],
    maximumSizeInBytes: fileSize,
    token: blobReadWriteToken(),
  });

  const { presignedUrl } = await presignUrl(
    signedToken,
    {
      operation: "put",
      pathname,
      access: "private",
      validUntil,
      allowedContentTypes: [contentType],
      maximumSizeInBytes: fileSize,
      allowOverwrite: false,
      addRandomSuffix: false,
    },
  );

  const response = NextResponse.json({
    success: true,
    uploadUrl: presignedUrl,
    pathname,
    registrationTicket,
    contentType,
    validUntil,
  });

  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-QLKLT-Upload-Route", "V05C-PUT-R13");

  return response;
}