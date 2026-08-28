import { issueSignedToken, presignUrl } from "@vercel/blob";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WORKER_TOKEN_ENV = "OCR_WORKER_TOKEN";
const WORKER_TOKEN_HEADERS = ["X-QLKLT-Worker-Token"];
const WORKER_ID_HEADERS = ["X-QLKLT-Worker-Id"];
const SIGNED_URL_TTL_MS = 5 * 60 * 1000;
const BACKEND_BASE = "https://qlklt-v414-api.vercel.app";

type Payload = Record<string, unknown>;

function first(payload: Payload, names: string[]): unknown {
  for (const name of names) {
    const value = payload[name];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function readHeader(request: Request, names: string[]): string {
  for (const name of names) {
    const value = request.headers.get(name)?.trim();
    if (value) return value;
  }
  return "";
}

function readWorkerToken(request: Request): string {
  return readHeader(request, WORKER_TOKEN_HEADERS);
}

function readWorkerId(request: Request, payload: Payload): string {
  return readHeader(request, WORKER_ID_HEADERS) ||
    String(first(payload, ["worker_id", "workerId"]) ?? "").trim();
}

function authorized(request: Request): boolean {
  const expected = process.env[WORKER_TOKEN_ENV]?.trim() ?? "";
  const supplied = readWorkerToken(request);
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(supplied, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

function positiveInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^[1-9][0-9]*$/.test(value.trim())) {
    const parsed = Number(value.trim());
    if (Number.isSafeInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function legacyPathname(payload: Payload): string {
  const fileId = positiveInt(first(payload, ["digital_file_id", "file_id", "digitalFileId", "fileId"]));
  if (!fileId) throw new Error("digital file id required");
  const canonical = `digital-files/${fileId}/source.pdf`;
  const supplied = first(payload, ["pathname", "blob_pathname", "blob_path", "storage_path"]);
  if (supplied !== undefined && String(supplied).trim() !== canonical) {
    throw new Error("pathname outside canonical scope");
  }
  return canonical;
}

async function ticketPathname(request: Request, payload: Payload): Promise<string | null> {
  const rawTicket = first(payload, ["download_ticket", "downloadTicket"]);
  if (rawTicket === undefined || rawTicket === null || String(rawTicket).trim() === "") return null;

  const downloadTicket = String(rawTicket).trim();
  const workerToken = readWorkerToken(request);
  const workerId = readWorkerId(request, payload);

  const response = await fetch(`${BACKEND_BASE}/api/ocr/worker/download-ticket/validate/`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-QLKLT-Worker-Token": workerToken,
      ...(workerId ? { "X-QLKLT-Worker-Id": workerId } : {}),
    },
    body: JSON.stringify({ download_ticket: downloadTicket }),
  });

  if (!response.ok) throw new Error(`download ticket validate status ${response.status}`);

  const value: unknown = await response.json();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("download ticket validate response invalid");
  }

  const root = value as Record<string, unknown>;
  const data = root.data;
  if (!root.success || !data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("download ticket validate rejected");
  }

  const pathname = String((data as Record<string, unknown>).pathname ?? "").trim();
  if (!pathname) throw new Error("download ticket validate missing pathname");
  if (pathname.includes("\\") || pathname.startsWith("/") || pathname.includes("..")) {
    throw new Error("download ticket validate pathname invalid");
  }
  return pathname;
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function sign(request: Request, payload: Payload): Promise<Response> {
  if (!authorized(request)) return json({ detail: "Unauthorized" }, 401);

  let pathname: string;
  try {
    pathname = (await ticketPathname(request, payload)) ?? legacyPathname(payload);
  } catch {
    return json({ detail: "Invalid source reference" }, 400);
  }

  const validUntil = Date.now() + SIGNED_URL_TTL_MS;
  try {
    const token = await issueSignedToken({ pathname, operations: ["get"], validUntil });
    const { presignedUrl } = await presignUrl(token, {
      operation: "get",
      pathname,
      access: "private",
      validUntil,
    });
    return json({ url: presignedUrl, expires_at: validUntil });
  } catch {
    return json({ detail: "Unable to issue source URL" }, 502);
  }
}

export async function POST(request: Request): Promise<Response> {
  let payload: Payload;
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return json({ detail: "Invalid JSON body" }, 400);
    }
    payload = value as Payload;
  } catch {
    return json({ detail: "Invalid JSON body" }, 400);
  }
  return sign(request, payload);
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const payload: Payload = {};
  url.searchParams.forEach((value, key) => { payload[key] = value; });
  return sign(request, payload);
}