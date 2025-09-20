import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";

type Context = { params: { id: string } };

export async function GET(_req: Request, { params }: Context) {
  const { id } = params;

  const data = await kv.get(`share:day:${id}`);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(data);
}
