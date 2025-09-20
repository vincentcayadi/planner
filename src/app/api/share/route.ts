import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";

type Task = {
  id: number;
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  duration: number;
  color: string;
};

type Payload = {
  dateKey: string; // "YYYY-MM-DD" for the shared day
  items: Task[]; // tasks/breaks for that day
  planner: { startTime: string; endTime: string; interval: number }; // meta
  ttlSeconds?: number; // optional override (default 7 days)
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Payload;

    if (!body?.dateKey || !Array.isArray(body?.items)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const key = `plan:day:${id}`;
    const ttl = Number.isFinite(body.ttlSeconds!)
      ? body.ttlSeconds!
      : 60 * 60 * 24 * 7; // 7d

    await kv.set(key, body, { ex: ttl });

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      (req.headers.get("origin") ?? "http://localhost:3000");
    const url = `${origin}/shared/${id}`;

    return NextResponse.json({ id, url }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to create share" },
      { status: 500 }
    );
  }
}
