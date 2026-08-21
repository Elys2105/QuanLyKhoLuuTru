import { del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_BASE = "https://qlklt-v414-he3f3zfz5-chaunguyen22012005-6505s-projects.vercel.app";

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

  const authResponse = await fetch(
    `${backendBase()}/api/auth/me/`,
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

  if (!authResponse.ok) {
    return NextResponse.json(
      { success: false, message: "Authentication failed." },
      { status: authResponse.status },
    );
  }

  let pathname = "";
  let registrationTicket = "";

  try {
    const body = (await request.json()) as {
      pathname?: string;
      registration_ticket?: string;
    };

    pathname = String(body.pathname || "")
      .trim()
      .replace(/^\/+/, "");

    registrationTicket = String(
      body.registration_ticket || "",
    ).trim();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  if (
    !validUploadPath(pathname) ||
    !registrationTicket
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid cleanup pathname/ticket.",
      },
      { status: 400 },
    );
  }

  const cleanupGrant = await fetch(
    `${backendBase()}/api/digital-files/direct-upload-cleanup-authorize/`,
    {
      method: "POST",
      headers: {
        Authorization: authorization,
        Accept: "application/json",
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        blob_path: pathname,
        registration_ticket: registrationTicket,
      }),
      cache: "no-store",
      redirect: "manual",
    },
  );

  if (!cleanupGrant.ok) {
    const cleanupText = await cleanupGrant.text();

    return new NextResponse(
      cleanupText || "Cleanup authorization denied.",
      {
        status: cleanupGrant.status,
        headers: {
          "Content-Type":
            cleanupGrant.headers.get("content-type") ||
            "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  await del(pathname, {
    token: blobReadWriteToken(),
  });

  return NextResponse.json({
    success: true,
    deleted: true,
  });
}