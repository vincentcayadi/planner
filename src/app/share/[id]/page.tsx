import { kv } from '@/lib/kv';
import { notFound } from 'next/navigation';
import clsx from 'clsx';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { COLORS } from '@/lib/colorConstants';


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


const timeToMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const minutesToTime = (mins: number) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
const to12h = (t: string) => {
  const [H, M] = t.split(':').map(Number);
  const ampm = H >= 12 ? 'PM' : 'AM';
  const h12 = H % 12 || 12;
  return `${h12}:${String(M).padStart(2, '0')} ${ampm}`;
};

function makeSlots(start: string, end: string, interval: number) {
  const out: string[] = [];
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  const step = Math.max(5, interval || 30);
  for (let t = s; t <= e; t += step) out.push(minutesToTime(t));
  return out;
}

function getDisplayRows(items: Task[], start: string, end: string, interval: number) {
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
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

// 👇 NOTE: params is a Promise in Next 15 typed routes
export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const data = await kv.get<SharedDay>(`share:day:${id}`);
  if (!data) notFound();

  const planner = data.planner ?? {
    startTime: '08:00',
    endTime: '23:30',
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
    <div className="h-full overflow-hidden bg-[radial-gradient(ellipse_at_100%_100%,_theme(colors.violet.300),_theme(colors.indigo.200)_60%,_theme(colors.blue.100))]">
      <div className="flex h-full">
        {/* Main Content - Full width for shared view */}
        <main className="flex-1 overflow-hidden p-3 md:p-6">
          <Card className="mx-auto flex h-full max-w-3xl flex-col overflow-clip bg-neutral-200/70 pt-3 md:pt-6 pb-0 shadow-lg">
            <CardHeader className="px-4 md:px-8 pt-2 pb-4 space-y-2">
              <div className="grid grid-cols-[1fr_auto] items-end leading-none font-bold tracking-tighter text-neutral-500">
                <div className="text-3xl md:text-5xl">{date.getDate()}</div>
                <div className="text-xl md:text-3xl">
                  {date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                </div>
              </div>
              <div className="space-y-1">
                <h1 className="text-base md:text-lg font-semibold text-neutral-800">
                  {date.toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h1>
                <p className="text-xs text-neutral-600">
                  {to12h(planner.startTime)} – {to12h(planner.endTime)} · {planner.interval}m intervals · Read-only view
                </p>
              </div>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col overflow-y-auto p-0">
              <div className="flex-1">
                {rows.map((row, i) => {
                  if (!row.task) {
                    return (
                      <div
                        key={`avail-${row.time}-${i}`}
                        className="grid grid-cols-[70px_1fr] sm:grid-cols-[90px_1fr] border-b border-neutral-200 md:grid-cols-[110px_1fr]"
                      >
                        <div className="flex items-center justify-center border-r border-neutral-200 bg-orange-100 px-3 py-3 text-xs font-semibold tracking-wide whitespace-nowrap text-neutral-700 tabular-nums sm:px-4 sm:py-4 md:px-5 md:py-4 md:text-sm min-h-[44px]">
                          {to12h(row.time)}
                        </div>
                        <div className="flex items-center bg-neutral-50 px-2 py-2 text-sm text-neutral-400 sm:px-3 sm:py-3 md:px-4 md:py-4 min-h-[44px]">
                          <span className="opacity-50 text-xs sm:text-sm">Available</span>
                        </div>
                      </div>
                    );
                  }

                  const colorConfig = COLORS.find((x) => x.name === row.task.color);

                  return (
                    <div
                      key={`task-${row.task.id}-${i}`}
                      className="grid grid-cols-[70px_1fr] sm:grid-cols-[90px_1fr] border-b border-neutral-200 md:grid-cols-[110px_1fr]"
                    >
                      <div className="flex items-start justify-center border-r border-neutral-200 bg-orange-100 px-3 py-3 text-xs font-semibold tracking-wide whitespace-nowrap text-neutral-700 tabular-nums sm:px-4 sm:py-4 md:px-5 md:py-4 md:text-sm">
                        {to12h(row.time)}
                      </div>
                      <div
                        className={`p-2 sm:p-4 md:p-6 ${colorConfig?.bg} ${colorConfig?.text} flex flex-col items-center justify-center gap-1 text-center md:gap-2`}
                        style={{
                          minHeight: `${Math.max(row.rowSpan * 44, 44)}px`,
                          height: `${Math.max(row.rowSpan * 44, 44)}px`,
                        }}
                      >
                        <div className="text-sm font-semibold sm:text-lg md:text-xl">{row.task.name}</div>
                        {row.task.description && (
                          <div className="text-xs whitespace-pre-wrap text-neutral-700 line-clamp-2 sm:line-clamp-none md:text-sm">
                            {row.task.description}
                          </div>
                        )}
                        <div className="text-xs text-neutral-600 sm:text-sm md:text-sm">
                          {to12h(row.task.startTime)} – {to12h(row.task.endTime)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {rows.length === 0 && (
                  <div className="p-8 text-center text-neutral-600">No items for this day.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
