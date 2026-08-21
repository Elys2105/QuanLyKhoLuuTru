import {
  issueSignedToken,
  presignUrl,
} from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_BASE = "https://qlklt-v414-he3f3zfz5-chaunguyen22012005-6505s-projects.vercel.app";
const HEAD_TTL_MS = 2 * 60 * 1000;

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

function validUploadPath(pathname: string): boolean {
  return /^digital-files\/uploads\/[0-9a-f-]{36}\.(pdf|doc|docx|xls|xlsx)$/i.test(
    pathname,
  );
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 },
    );
  }

  let body: {
    profile?: string | number;
    document?: string | number | null;
    blob_path?: string;
    registration_ticket?: string;
    original_name?: string;
    file_size?: number;
    mime_type?: string;
    is_primary?: boolean;
    dry_run?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const pathname = String(body.blob_path || "")
    .trim()
    .replace(/^\/+/, "");
  const registrationTicket = String(
    body.registration_ticket || "",
  ).trim();
  const fileSize = Number(body.file_size || 0);

  if (
    !validUploadPath(pathname) ||
    !registrationTicket ||
    !Number.isSafeInteger(fileSize) ||
    fileSize <= 0
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid registration payload.",
      },
      { status: 400 },
    );
  }

  const validUntil = Date.now() + HEAD_TTL_MS;

  const signedToken = await issueSignedToken({
    pathname,
    operations: ["head"],
    validUntil,
    token: blobReadWriteToken(),
  });

  const { presignedUrl } = await presignUrl(
    signedToken,
    {
      operation: "head",
      pathname,
      access: "private",
      validUntil,
    },
  );

  const upstream = await fetch(
    `${backendBase()}/api/digital-files/register-blob/`,
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
        blob_path: pathname,
        registration_ticket: registrationTicket,
        blob_head_url: presignedUrl,
        original_name: body.original_name,
        file_size: fileSize,
        mime_type: body.mime_type,
        is_primary: Boolean(body.is_primary),
        dry_run: Boolean(body.dry_run),
      }),
      cache: "no-store",
      redirect: "manual",
    },
  );

  const upstreamBody = await upstream.text();

  return new NextResponse(upstreamBody, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ||
        "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-QLKLT-Register-Route": "V05C-R13-SIGNED-HEAD",
    },
  });
}