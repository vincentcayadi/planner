"use client";

import React, { useMemo, useState } from "react";
import { Trash2, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Dexie from "dexie";

type Task = {
  id: number;
  name: string;
  description?: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  duration: number; // minutes
  color: string;
};

const db = new Dexie("plannerDB");
db.version(1).stores({ days: "dateKey", meta: "key" });
const days = () => db.table("days");
const meta = () => db.table("meta");

export default function ExamScheduler() {
  // ---------- state ----------
  const [schedules, setSchedules] = useState<Record<string, Task[]>>({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("23:30");
  const [interval, setInterval] = useState(30); // minutes

  // Add task form state
  const [taskName, setTaskName] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskStartTime, setTaskStartTime] = useState("08:00");
  const [taskDuration, setTaskDuration] = useState("60"); // minutes (string for Select)
  const [selectedColor, setSelectedColor] = useState("blue");
  const [nameError, setNameError] = useState(false);

  // Conflict dialog state
  const [conflicts, setConflicts] = useState<Task[]>([]);
  const [pendingTask, setPendingTask] = useState<{
    task: Task;
    dateKey: string;
  } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Clear-all dialog state
  const [clearOpen, setClearOpen] = useState(false);
  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<Task | null>(null);

  // edit-conflict dialog state
  const [editConflicts, setEditConflicts] = useState<Task[]>([]);
  const [editPending, setEditPending] = useState<Task | null>(null);
  const [editConflictOpen, setEditConflictOpen] = useState(false);

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

  // ---------- helpers ----------
  // tiny debounce util so we don't write on every keystroke
  function useDebouncedCallback<T extends (...args: any[]) => void>(
    fn: T,
    delay: number
  ) {
    const fnRef = React.useRef<T>(fn);
    React.useEffect(() => {
      fnRef.current = fn;
    }, [fn]);

    return React.useMemo(() => {
      let t: ReturnType<typeof setTimeout> | null = null;
      return (...args: Parameters<T>) => {
        if (t) clearTimeout(t);
        t = setTimeout(() => fnRef.current(...args), delay);
      };
    }, [delay]);
  }

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  type FSWin = Window &
    typeof globalThis & {
      showSaveFilePicker?: (opts?: any) => Promise<any>;
      showOpenFilePicker?: (opts?: any) => Promise<any>;
    };

  const w: FSWin | undefined =
    typeof window !== "undefined" ? (window as FSWin) : undefined;

  const supportsFS = !!(w?.showSaveFilePicker && w?.showOpenFilePicker);

  const formatDateKey = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const timeToMinutes = (t: string): number => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const minutesToTime = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  // display helper: 24h -> 12h with AM/PM
  const to12h = (t: string): string => {
    if (!t) return "";
    const [H, M] = t.split(":").map(Number);
    const ampm = H >= 12 ? "PM" : "AM";
    const h12 = H % 12 || 12;
    return `${h12}:${String(M).padStart(2, "0")} ${ampm}`;
  };

  const overlaps = (
    aStart: number,
    aEnd: number,
    bStart: number,
    bEnd: number
  ): boolean => aStart < bEnd && bStart < aEnd;

  // Generate time slots based on current start/end/interval
  const timeSlots = useMemo<string[]>(() => {
    const out: string[] = [];
    const safeInterval = Math.max(
      5,
      Number.isFinite(interval) ? Number(interval) : 30
    );
    let t = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    if (end <= t) return out;
    while (t <= end) {
      out.push(minutesToTime(t));
      t += safeInterval;
    }
    return out;
  }, [startTime, endTime, interval]);

  // Duration options (1× to 12× interval)
  const durationOptions = useMemo(() => {
    const safeInterval = Math.max(
      5,
      Number.isFinite(interval) ? Number(interval) : 30
    );
    return Array.from({ length: 12 }, (_, i) => (i + 1) * safeInterval);
  }, [interval]);

  const getCurrentSchedule = () => schedules[formatDateKey(currentDate)] || [];

  // ---------- CRUD ----------
  const addTask = () => {
    const trimmed = taskName.trim();
    if (!trimmed) {
      setNameError(true);
      toast.error("Missing title", {
        description: "Enter a Subject / Paper / Task.",
      });
      return;
    }
    setNameError(false);

    // validate start is not before the day's start
    if (timeToMinutes(taskStartTime) < timeToMinutes(startTime)) {
      toast.error("Invalid start time", {
        description: `Start time (${to12h(
          taskStartTime
        )}) is before your day start (${to12h(startTime)}).`,
      });
      return;
    }

    const dateKey = formatDateKey(currentDate);
    const current = [...getCurrentSchedule()];
    const startM = timeToMinutes(taskStartTime);
    const endLimit = timeToMinutes(endTime);
    const endM = Math.min(startM + parseInt(taskDuration), endLimit);

    const newTask = {
      id: Date.now(),
      name: trimmed,
      description: taskDesc.trim() || "", // NEW
      startTime: minutesToTime(startM),
      endTime: minutesToTime(endM),
      duration: endM - startM,
      color: selectedColor,
    };

    // conflict detection (unchanged)
    const hits = current.filter((t) =>
      overlaps(
        startM,
        endM,
        timeToMinutes(t.startTime),
        timeToMinutes(t.endTime)
      )
    );
    if (hits.length) {
      setConflicts(hits);
      setPendingTask({ task: newTask, dateKey });
      setDialogOpen(true);
      toast.error("Time conflict", {
        description: `${trimmed} overlaps ${hits.length} item(s).`,
      });
      return;
    }

    // add
    const updated = [...current, newTask].sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );
    setSchedules({ ...schedules, [dateKey]: updated });
    setTaskName("");
    setTaskDesc(""); // NEW
    toast.success("Task added", {
      description: `${newTask.name} — ${to12h(newTask.startTime)} to ${to12h(
        newTask.endTime
      )}`,
    });
  };

  const overrideConflicts = () => {
    if (!pendingTask) return;
    const { task, dateKey } = pendingTask;
    const current = [...getCurrentSchedule()].filter(
      (t) => !conflicts.some((c) => c.id === t.id)
    );
    const updated = [...current, task].sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );
    setSchedules({ ...schedules, [dateKey]: updated });
    setPendingTask(null);
    setConflicts([]);
    setDialogOpen(false);
    setTaskName("");
    toast.success("Task overridden successfully");
  };

  const removeTask = (id: number) => {
    const dateKey = formatDateKey(currentDate);
    const filtered = getCurrentSchedule().filter((t) => t.id !== id);
    setSchedules({ ...schedules, [dateKey]: filtered });
    toast.error("Task Deleted");
  };

  const clearAll = () => {
    const dateKey = formatDateKey(currentDate);
    const next = { ...schedules };
    delete next[dateKey];
    setSchedules(next);
    toast.error("All events for this day were removed");
  };

  // Auto-fill gaps as Breaks
  const autoFillBreaks = () => {
    const dateKey = formatDateKey(currentDate);
    const startM = timeToMinutes(startTime);
    const endM = timeToMinutes(endTime);
    const current = [...getCurrentSchedule()].sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );

    const breaks = [];
    let cursor = startM;
    current.forEach((t) => {
      const s = timeToMinutes(t.startTime),
        e = timeToMinutes(t.endTime);
      if (s > cursor) {
        breaks.push({
          id: Date.now() + Math.random(),
          name: "Break",
          startTime: minutesToTime(cursor),
          endTime: minutesToTime(s),
          duration: s - cursor,
          color: "cyan",
        });
      }
      cursor = Math.max(cursor, e);
    });
    if (cursor < endM)
      breaks.push({
        id: Date.now() + Math.random(),
        name: "Break",
        startTime: minutesToTime(cursor),
        endTime: minutesToTime(endM),
        duration: endM - cursor,
        color: "cyan",
      });

    const updated = [...current, ...breaks].sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );
    setSchedules({ ...schedules, [dateKey]: updated });
    toast.success("Breaks filled", {
      description: "Automatically inserted free-time blocks.",
    });
  };

  // ---------- navigation ----------
  const goToPreviousDay = () =>
    setCurrentDate((d) => {
      const nd = new Date(d);
      nd.setDate(nd.getDate() - 1);
      return nd;
    });
  const goToNextDay = () =>
    setCurrentDate((d) => {
      const nd = new Date(d);
      nd.setDate(nd.getDate() + 1);
      return nd;
    });
  const goToToday = () => setCurrentDate(new Date());

  // Edit helpers
  const openEdit = (item) => {
    setEditItem(item);
    setEditOpen(true);
  };
  const saveEdit = () => {
    if (!editItem) return;

    // 1) Start must be within the day's window
    if (timeToMinutes(editItem.startTime) < timeToMinutes(startTime)) {
      toast.error("Invalid start time", {
        description: `Start time (${to12h(
          editItem.startTime
        )}) is before your day start (${to12h(startTime)}).`,
      });
      return;
    }

    const others = getCurrentSchedule().filter((t) => t.id !== editItem.id);

    // Work in minutes for math, clamp to day end
    const startBound = timeToMinutes(editItem.startTime);
    const endBound = timeToMinutes(endTime);
    const rawDuration = Number(editItem.duration || 0);
    const safeDuration = Math.max(5, rawDuration); // at least 5 minutes
    const endComputed = Math.min(startBound + safeDuration, endBound);

    // 2) Block zero/negative duration after clamping
    if (endComputed <= startBound) {
      toast.error("Invalid duration", {
        description:
          "The resulting duration is zero or negative. Adjust the start time or duration.",
      });
      return;
    }

    const normalized = {
      ...editItem,
      startTime: minutesToTime(startBound),
      endTime: minutesToTime(endComputed),
      duration: endComputed - startBound,
    };

    // 3) Conflict check against the rest of the items
    const hits = others.filter((t) =>
      overlaps(
        startBound,
        endComputed,
        timeToMinutes(t.startTime),
        timeToMinutes(t.endTime)
      )
    );
    if (hits.length) {
      setEditConflicts(hits);
      setEditPending(normalized);
      setEditConflictOpen(true);
      return;
    }

    const dateKey = formatDateKey(currentDate);
    const updated = [...others, normalized].sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );

    setSchedules({ ...schedules, [dateKey]: updated });
    setEditOpen(false);
    toast.success("Saved changes", { description: "Item updated." });
  };

  // Build display rows with proper span
  const getScheduleDisplay = () => {
    const schedule = getCurrentSchedule();
    const display = [];
    const safeInterval = Math.max(
      5,
      Number.isFinite(interval) ? Number(interval) : 30
    );
    const dayEnd = timeToMinutes(endTime);

    for (let i = 0; i < timeSlots.length; i++) {
      const t = timeSlots[i];
      const tm = timeToMinutes(t);
      const starting = schedule.find((x) => timeToMinutes(x.startTime) === tm);

      if (starting) {
        const span = Math.ceil(starting.duration / safeInterval);
        display.push({
          time: t,
          task: starting,
          isTaskStart: true,
          rowSpan: span,
        });
        i += span - 1; // skip covered slots
        continue;
      }

      // If we're exactly at the terminal boundary, don't render an empty row
      if (tm >= dayEnd) continue;

      const ongoing = schedule.find(
        (x) => tm >= timeToMinutes(x.startTime) && tm < timeToMinutes(x.endTime)
      );
      if (!ongoing)
        display.push({ time: t, task: null, isTaskStart: false, rowSpan: 1 });
    }
    return display;
  };

  const currentSchedule = getCurrentSchedule();
  const dateString = currentDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  // JSON deserialization
  const serialize = () => ({
    version: 1,
    currentDate: formatDateKey(currentDate),
    startTime,
    endTime,
    interval,
    schedules,
  });
  const loadFromData = (data) => {
    try {
      if (!data || typeof data !== "object") return;
      if (data.startTime) setStartTime(data.startTime);
      if (data.endTime) setEndTime(data.endTime);
      if (data.interval) setInterval(Number(data.interval));
      if (data.currentDate) setCurrentDate(new Date(data.currentDate));
      if (data.schedules && typeof data.schedules === "object")
        setSchedules(data.schedules);
    } catch (e) {
      /* swallow */
    }
  };

  const saveJSON = async () => {
    const json = JSON.stringify(serialize(), null, 2);
    try {
      if (supportsFS && w?.showSaveFilePicker) {
        const handle = await w.showSaveFilePicker({
          suggestedName: `planner-${formatDateKey(currentDate)}.json`,
          types: [
            {
              description: "JSON Files",
              accept: { "application/json": [".json"] },
            },
          ],
        });
        const writable = await (handle as any).createWritable();
        await writable.write(new Blob([json], { type: "application/json" }));
        await writable.close();
        return;
      }
    } catch (e) {
      // fall through to download
    }
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `planner-${formatDateKey(currentDate)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const openJSON = async () => {
    try {
      if (supportsFS && w?.showOpenFilePicker) {
        const [handle] = await w.showOpenFilePicker({
          multiple: false,
          types: [
            {
              description: "JSON Files",
              accept: { "application/json": [".json"] },
            },
          ],
        });
        const file = await (handle as any).getFile();
        const text = await file.text();
        const data = JSON.parse(text);
        loadFromData(data);
        return;
      }
    } catch (e) {
      // fall back to <input type="file">
    }
    fileInputRef.current?.click();
  };

  const onFilePicked = async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      loadFromData(data);
    } catch (e) {
      /* ignore */
    } finally {
      ev.target.value = "";
    }
  };

  // ---- Dexie load on mount ----
  React.useEffect(() => {
    (async () => {
      try {
        const rows = await days().toArray();
        if (rows?.length) {
          const loaded = {};
          rows.forEach((r) => {
            loaded[r.dateKey] = r.items || [];
          });
          setSchedules(loaded);
        }
        const [st, et, itv] = await Promise.all([
          meta().get("startTime"),
          meta().get("endTime"),
          meta().get("interval"),
        ]);
        if (st?.value) setStartTime(st.value);
        if (et?.value) setEndTime(et.value);
        if (itv?.value) setInterval(Number(itv.value));
      } catch (e) {
        /* ignore */
      }
    })();
  }, []);

  // ---- Dexie save (debounced) ----
  const saveSchedulesDebounced = useDebouncedCallback(async (data) => {
    try {
      const rows = Object.entries(data).map(([dateKey, items]) => ({
        dateKey,
        items,
      }));
      await days().clear();
      if (rows.length) await days().bulkPut(rows);
    } catch (e) {
      /* ignore */
    }
  }, 300);
  React.useEffect(() => {
    saveSchedulesDebounced(schedules);
  }, [schedules]);
  React.useEffect(() => {
    (async () => {
      try {
        await meta().bulkPut([
          { key: "startTime", value: startTime },
          { key: "endTime", value: endTime },
          { key: "interval", value: interval },
        ]);
      } catch (e) {
        /* ignore */
      }
    })();
  }, [startTime, endTime, interval]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex h-screen">
        <div className="w-80 bg-white shadow-lg p-6 overflow-y-auto flex flex-col gap-4">
          <Card className="gap-0">
            <CardContent className="p-4">
              <div className="text-center">
                <h2 className="text-xl font-bold text-neutral-700">
                  {dateString}
                </h2>
                <div className="flex items-center justify-between mt-3">
                  <Button onClick={goToPreviousDay} variant="outline" size="sm">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button onClick={goToToday} variant="outline" size="sm">
                    Today
                  </Button>
                  <Button onClick={goToNextDay} variant="outline" size="sm">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gap-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Planner Settings</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-neutral-500">Start</label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="text-sm pr-3 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-clear-button]:hidden [&::-webkit-calendar-picker-indicator]:hidden"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-500">End</label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="text-sm pr-3 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-clear-button]:hidden [&::-webkit-calendar-picker-indicator]:hidden"
                  />
                </div>
              </div>
              <div className="mt-2">
                <label className="text-xs text-neutral-500">
                  Interval (minutes)
                </label>
                <Select
                  value={String(interval)}
                  onValueChange={(v) => setInterval(Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    {[15, 30, 60].map((v) => (
                      <SelectItem key={v} value={String(v)}>
                        {v} minutes
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={openJSON}
                >
                  Open JSON
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={saveJSON}
                >
                  Save JSON
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={onFilePicked}
              />
            </CardContent>
          </Card>

          <Card className="gap-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Add Task </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div>
                <Input
                  placeholder="Subject / Paper / Task"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  aria-invalid={nameError}
                  className={`${
                    nameError
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }`}
                />
                {nameError && (
                  <p className="mt-1 text-xs text-destructive">
                    This field is required.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-neutral-500">Start</label>
                  <Input
                    type="time"
                    value={taskStartTime}
                    onChange={(e) => setTaskStartTime(e.target.value)}
                    className="[appearance:textfield] pr-3 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-clear-button]:hidden [&::-webkit-calendar-picker-indicator]:hidden"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-500">Duration</label>
                  <Select
                    value={String(taskDuration)}
                    onValueChange={(v) => setTaskDuration(v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {durationOptions.map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d >= 60 ? `${d / 60}h` : `${d}min`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs text-neutral-500">Description</label>
                <Textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Optional notes for this item"
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-2 block">
                  Palette
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colors.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setSelectedColor(c.name)}
                      className={`h-8 rounded-lg ${c.bg} ${
                        selectedColor === c.name
                          ? "ring-2 ring-offset-2 ring-neutral-400"
                          : ""
                      } cursor-pointer`}
                      aria-label={c.name}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={addTask} className="flex-1">
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="gap-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Current Items</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {currentSchedule.map((task) => {
                const c = colors.find((x) => x.name === task.color);
                return (
                  <div
                    key={task.id}
                    className={`p-2 rounded ${c?.bg} flex items-center justify-between`}
                  >
                    <div>
                      <div className={`font-medium ${c?.text} text-sm`}>
                        {task.name}
                      </div>
                      <div className="text-xs text-neutral-600">
                        {task.description ? (
                          <div className="text-neutral-700 mb-0.5 whitespace-pre-wrap">
                            {task.description}
                          </div>
                        ) : null}
                        {to12h(task.startTime)} – {to12h(task.endTime)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => openEdit(task)}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-neutral-700 hover:bg-neutral-100"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        onClick={() => removeTask(task.id)}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {currentSchedule.length === 0 && (
                <div className="text-sm text-neutral-500 text-center py-4">
                  No tasks scheduled
                </div>
              )}
              {currentSchedule.length > 0 && (
                <>
                  <Button
                    onClick={autoFillBreaks}
                    variant="outline"
                    size="sm"
                    className="w-full mt-3"
                  >
                    Fill Breaks
                  </Button>
                  <Button
                    onClick={() => setClearOpen(true)}
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 text-destructive border-destructive"
                  >
                    Clear All
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 p-6 overflow-hidden">
          <Card className="shadow-lg max-w-7xl mx-auto h-full flex flex-col bg-neutral-200/70">
            <CardHeader className="flex-shrink-0">
              <div className="grid grid-cols-[1fr_auto] items-end text-neutral-600 tracking-tighter">
                <div className="pl-4 pt-2">
                  <div className="text-5xl font-bold leading-none">
                    {currentDate.getDate()}
                  </div>
                </div>
                <div className="pr-4 pb-1 self-end">
                  <div className="text-3xl font-semibold leading-none">
                    {currentDate
                      .toLocaleDateString("en-US", { weekday: "short" })
                      .toUpperCase()}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              <div className="min-h-full">
                {getScheduleDisplay().map((slot, idx) => {
                  if (!slot.task) {
                    return (
                      <div
                        key={`${to12h(slot.time)}-${idx}`}
                        className="grid grid-cols-12 border-b border-neutral-200"
                      >
                        <div className="col-span-2 bg-orange-100 p-4 border-r border-neutral-200 text-base font-semibold tracking-tighter text-neutral-700 flex items-center">
                          {to12h(slot.time)}
                        </div>
                        <div className="col-span-10 bg-neutral-50 p-4 text-sm text-neutral-400 flex items-center">
                          <span className="opacity-50">Available</span>
                        </div>
                      </div>
                    );
                  }
                  const c = colors.find((x) => x.name === slot.task.color);
                  return (
                    <div
                      key={`${slot.task.id}-${idx}`}
                      className="grid grid-cols-12 border-b border-neutral-200"
                    >
                      <div className="col-span-2 bg-orange-100 p-4 border-r border-neutral-200 text-base font-semibold tracking-tighter text-neutral-700 flex items-start">
                        {to12h(slot.time)}
                      </div>
                      <div
                        className={`col-span-10 ${c?.bg} p-6 flex items-center justify-center text-center`}
                        style={{
                          minHeight: `${slot.rowSpan * 60}px`,
                          height: `${slot.rowSpan * 60}px`,
                        }}
                      >
                        <div>
                          <div
                            className={`font-semibold ${c?.text} text-xl mb-2`}
                          >
                            {slot.task.name}
                          </div>
                          {slot.task.description ? (
                            <div className="text-sm text-neutral-700 mb-1 whitespace-pre-wrap">
                              {slot.task.description}
                            </div>
                          ) : null}
                          <div className="text-sm text-neutral-600">
                            {to12h(slot.task.startTime)} -{" "}
                            {to12h(slot.task.endTime)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Time conflict detected</AlertDialogTitle>
            <AlertDialogDescription>
              The new item overlaps with the following {conflicts.length} event
              {conflicts.length > 1 ? "s" : ""}:
              <ul className="mt-2 list-disc pl-5 space-y-1">
                {conflicts.map((c) => (
                  <li key={c.id}>
                    <span className="font-medium">{c.name}</span> —{" "}
                    {to12h(c.startTime)}–{to12h(c.endTime)}
                  </li>
                ))}
              </ul>
              Do you want to override (replace) the conflicts?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDialogOpen(false);
                setPendingTask(null);
                setConflicts([]);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={overrideConflicts}
            >
              Override
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit item</DialogTitle>
            <DialogDescription>
              Update the name, start time, duration, or color.
            </DialogDescription>
          </DialogHeader>
          {editItem && (
            <div className="space-y-3">
              <Input
                value={editItem.name}
                onChange={(e) =>
                  setEditItem({ ...editItem, name: e.target.value })
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-neutral-500">Start</label>
                  <Input
                    type="time"
                    value={editItem.startTime}
                    onChange={(e) => {
                      const val = e.target.value;
                      const startM = Math.max(
                        timeToMinutes(startTime),
                        timeToMinutes(val)
                      );
                      const endLimit = timeToMinutes(endTime);
                      const endM = Math.min(
                        startM + Number(editItem.duration || 0),
                        endLimit
                      );
                      setEditItem({
                        ...editItem,
                        startTime: minutesToTime(startM),
                        endTime: minutesToTime(endM),
                        duration: endM - startM,
                      });
                    }}
                    className="[appearance:textfield] pr-3 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-clear-button]:hidden [&::-webkit-calendar-picker-indicator]:hidden"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-500">Duration</label>
                  <Select
                    value={String(editItem.duration)}
                    onValueChange={(v) => {
                      const startM = Math.max(
                        timeToMinutes(startTime),
                        timeToMinutes(editItem.startTime)
                      );
                      const endLimit = timeToMinutes(endTime);
                      const dur = Number(v);
                      const endM = Math.min(startM + dur, endLimit);
                      setEditItem({
                        ...editItem,
                        duration: endM - startM,
                        endTime: minutesToTime(endM),
                        startTime: minutesToTime(startM),
                      });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {durationOptions.map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d >= 60 ? `${d / 60}h` : `${d}min`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs text-neutral-500">Description</label>
                <Textarea
                  value={editItem.description ?? ""}
                  onChange={(e) =>
                    setEditItem({ ...editItem, description: e.target.value })
                  }
                  placeholder="Optional notes for this item"
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-2 block">
                  Palette
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colors.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() =>
                        setEditItem({ ...editItem, color: c.name })
                      }
                      className={`h-8 rounded-lg ${c.bg} ${
                        editItem.color === c.name
                          ? "ring-2 ring-offset-2 ring-neutral-400"
                          : ""
                      } cursor-pointer`}
                      aria-label={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={editConflictOpen}
        onOpenChange={(open) => {
          setEditConflictOpen(open);
          if (!open) {
            /* if user cancels via outside click */
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Time conflict detected</AlertDialogTitle>
            <AlertDialogDescription>
              The changes overlap with {editConflicts.length} event
              {editConflicts.length > 1 ? "s" : ""}:
              <ul className="mt-2 list-disc pl-5 space-y-1">
                {editConflicts.map((c) => (
                  <li key={c.id}>
                    <span className="font-medium">{c.name}</span> —{" "}
                    {to12h(c.startTime)}–{to12h(c.endTime)}
                  </li>
                ))}
              </ul>
              Do you want to override (replace) the conflicts?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setEditConflictOpen(false);
                setEditPending(null);
                setEditConflicts([]);
                toast.error("Task failed to modify", {
                  description: "No changes were applied.",
                });
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!editPending) return;
                const dateKey = formatDateKey(currentDate);
                const kept = getCurrentSchedule().filter(
                  (t) =>
                    !editConflicts.some((c) => c.id === t.id) &&
                    t.id !== editPending.id
                );
                const updated = [...kept, editPending].sort(
                  (a, b) =>
                    timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
                );
                setSchedules({ ...schedules, [dateKey]: updated });
                setEditPending(null);
                setEditConflicts([]);
                setEditConflictOpen(false);
                setEditOpen(false);
                toast.success("Task overridden successfully", {
                  description: "Conflicting events were replaced.",
                });
              }}
            >
              Override
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all events?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all items for {dateString}. You can’t undo this
              action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                clearAll();
                setClearOpen(false);
              }}
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
