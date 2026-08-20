import { NextRequest } from "next/server";

import { signedDigitalFileRedirect } from "@/lib/storage/digital-file-blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await context.params;

  return signedDigitalFileRedirect(
    request,
    id,
    "preview",
  );
}