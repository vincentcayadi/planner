import { kv } from "@/lib/kv";
import { notFound } from "next/navigation";
import clsx from "clsx";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Task = {
  id: number;
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  duration: number;
  color: string;
};

type SharedDay = {
  dateKey: string; // "YYYY-MM-DD"
  items: Task[];
  planner?: { startTime: string; endTime: string; interval: number };
};

const colors = [
  { name: "blue", bg: "bg-blue-200", text: "text-blue-800" },
  { name: "green", bg: "bg-green-200", text: "text-green-800" },
  { name: "yellow", bg: "bg-yellow-200", text: "text-yellow-800" },
  { name: "purple", bg: "bg-purple-200", text: "text-purple-800" },
  { name: "pink", bg: "bg-pink-200", text: "text-pink-800" },
  { name: "orange", bg: "bg-orange-200", text: "text-orange-800" },
  { name: "cyan", bg: "bg-cyan-200", text: "text-cyan-800" },
  { name: "neutral", bg: "bg-neutral-200", text: "text-neutral-800" },
];

const timeToMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const minutesToTime = (mins: number) =>
  `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(
    mins % 60
  ).padStart(2, "0")}`;
const to12h = (t: string) => {
  const [H, M] = t.split(":").map(Number);
  const ampm = H >= 12 ? "PM" : "AM";
  const h12 = H % 12 || 12;
  return `${h12}:${String(M).padStart(2, "0")} ${ampm}`;
};

function makeSlots(start: string, end: string, interval: number) {
  const out: string[] = [];
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  const step = Math.max(5, interval || 30);
  for (let t = s; t <= e; t += step) out.push(minutesToTime(t));
  return out;
}

function getDisplayRows(
  items: Task[],
  start: string,
  end: string,
  interval: number
) {
  const timeSlots = makeSlots(start, end, interval);
  const dayEnd = timeToMinutes(end);
  const safeInterval = Math.max(5, interval || 30);

  const rows: Array<{ time: string; task: Task | null; rowSpan: number }> = [];
  for (let i = 0; i < timeSlots.length; i++) {
    const t = timeSlots[i];
    const tm = timeToMinutes(t);
    const starting = items.find((x) => timeToMinutes(x.startTime) === tm);

    if (starting) {
      const span = Math.ceil(starting.duration / safeInterval);
      rows.push({ time: t, task: starting, rowSpan: span });
      i += span - 1;
      continue;
    }
    if (tm >= dayEnd) continue;

    const ongoing = items.find(
      (x) => tm >= timeToMinutes(x.startTime) && tm < timeToMinutes(x.endTime)
    );
    if (!ongoing) rows.push({ time: t, task: null, rowSpan: 1 });
  }
  return rows;
}

function parseDateKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

// 👇 NOTE: params is a Promise in Next 15 typed routes
export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const data = await kv.get<SharedDay>(`share:day:${id}`);
  if (!data) notFound();

  const planner = data.planner ?? {
    startTime: "08:00",
    endTime: "23:30",
    interval: 30,
  };

  const rows = getDisplayRows(
    data.items ?? [],
    planner.startTime,
    planner.endTime,
    planner.interval
  );
  const date = parseDateKey(data.dateKey);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_100%_100%,_theme(colors.violet.300),_theme(colors.indigo.200)_60%,_theme(colors.blue.100))]">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <header className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Shared Day —{" "}
              {date.toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </h1>
            <p className="text-sm text-neutral-600">
              Window: {to12h(planner.startTime)} – {to12h(planner.endTime)} ·
              Interval {planner.interval}m
            </p>
          </div>
        </header>

        <div className="shadow-lg rounded-2xl overflow-hidden bg-white/70 backdrop-blur">
          <div className="divide-y divide-neutral-200">
            {rows.map((row, i) =>
              !row.task ? (
                <div
                  key={`avail-${row.time}-${i}`}
                  className="grid [grid-template-columns:96px_1fr]"
                >
                  <div className="bg-orange-100 px-4 py-4 border-r border-neutral-200 text-sm font-semibold tracking-tight text-neutral-700 tabular-nums">
                    {to12h(row.time)}
                  </div>
                  <div className="bg-neutral-50 px-4 py-4 text-sm text-neutral-400 flex items-center">
                    <span className="opacity-60">Available</span>
                  </div>
                </div>
              ) : (
                <div
                  key={`task-${row.task.id}-${i}`}
                  className="grid [grid-template-columns:96px_1fr]"
                >
                  <div className="bg-orange-100 px-4 py-4 border-r border-neutral-200 text-sm font-semibold tracking-tight text-neutral-700 tabular-nums">
                    {to12h(row.time)}
                  </div>
                  <div
                    className={clsx(
                      "px-6 py-6 flex items-center justify-center text-center",
                      colors.find((x) => x.name === row.task!.color)?.bg
                    )}
                    style={{
                      minHeight: row.rowSpan * 60,
                      height: row.rowSpan * 60,
                    }}
                  >
                    <div>
                      <div
                        className={clsx(
                          "font-semibold text-xl mb-2",
                          colors.find((x) => x.name === row.task!.color)?.text
                        )}
                      >
                        {row.task.name}
                      </div>
                      {row.task.description ? (
                        <div className="text-sm text-neutral-700 mb-1 whitespace-pre-wrap">
                          {row.task.description}
                        </div>
                      ) : null}
                      <div className="text-sm text-neutral-600">
                        {to12h(row.task.startTime)} – {to12h(row.task.endTime)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}

            {rows.length === 0 && (
              <div className="p-8 text-center text-neutral-600">
                No items for this day.
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 text-xs text-neutral-500">
          This view is read-only.
        </p>
      </div>
    </div>
  );
}
