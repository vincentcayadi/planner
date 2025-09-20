// app/shared/[id]/page.tsx
import { kv } from "@/lib/kv";
import { notFound } from "next/navigation";

type Task = {
  id: number;
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  duration: number;
  color: string;
};

type SharedDoc = {
  dateKey: string;
  items: Task[];
  planner: { startTime: string; endTime: string; interval: number };
};

function to12h(t: string) {
  const [H, M] = t.split(":").map(Number);
  const ampm = H >= 12 ? "PM" : "AM";
  const h12 = H % 12 || 12;
  return `${h12}:${String(M).padStart(2, "0")} ${ampm}`;
}

export default async function SharedDayPage({
  params,
}: {
  params: { id: string };
}) {
  const key = `plan:day:${params.id}`;
  const doc = (await kv.get(key)) as SharedDoc | null;
  if (!doc) notFound();

  const { dateKey, items, planner } = doc;
  const date = new Date(dateKey + "T00:00:00");

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Shared Schedule —{" "}
            {date.toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Day window: {to12h(planner.startTime)} – {to12h(planner.endTime)}
            {" · "}Interval: {planner.interval} min
          </p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg border bg-white p-6 text-neutral-500">
            No items for this day.
          </div>
        ) : (
          <div className="rounded-lg border bg-white divide-y">
            {items
              .slice()
              .sort(
                (a, b) =>
                  Number(a.startTime.slice(0, 2)) * 60 +
                  Number(a.startTime.slice(3)) -
                  (Number(b.startTime.slice(0, 2)) * 60 +
                    Number(b.startTime.slice(3)))
              )
              .map((t) => (
                <div key={t.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold">{t.name}</div>
                      {t.description ? (
                        <div className="text-sm text-neutral-700 whitespace-pre-wrap mt-1">
                          {t.description}
                        </div>
                      ) : null}
                      <div className="text-sm text-neutral-600 mt-1">
                        {to12h(t.startTime)} – {to12h(t.endTime)}{" "}
                        <span className="text-neutral-400">
                          ({t.duration} min)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
