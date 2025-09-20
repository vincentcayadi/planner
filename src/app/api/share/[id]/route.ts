import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const key = `plan:day:${params.id}`;
  const doc = await kv.get(key);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doc);
}
