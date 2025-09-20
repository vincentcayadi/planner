// src/app/api/share/[id]/route.ts
import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";

type Context = { params: { id: string } };

export async function GET(_req: Request, { params }: Context) {
  const { id } = params;
  const key = `share:day:${id}`;

  const data = await kv.get(key);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
