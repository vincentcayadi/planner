"use client"

import * as React from "react"
import { Clock2Icon } from "lucide-react"

import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Calendar16Props {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  startTime: string;
  onStartTimeChange: (time: string) => void;
  endTime: string;
  onEndTimeChange: (time: string) => void;
  className?: string;
}

export default function Calendar16({
  selectedDate,
  onDateSelect,
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
  className
}: Calendar16Props) {

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onDateSelect(date);
    }
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onStartTimeChange(e.target.value);
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onEndTimeChange(e.target.value);
  };

  return (
    <Card className={`w-full sm:w-fit py-4 ${className || ''}`}>
      <CardContent className="px-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          weekStartsOn={1}
          className="bg-transparent p-0"
        />
      </CardContent>
      <CardFooter className="flex flex-col gap-4 border-t px-4 !pt-4">
        <div className="flex w-full flex-col gap-2">
          <Label htmlFor="time-from" className="label-text">Start Time</Label>
          <div className="relative flex w-full items-center gap-2">
            <Clock2Icon className="text-muted-foreground pointer-events-none absolute left-2.5 size-4 select-none" />
            <Input
              id="time-from"
              type="time"
              step="1"
              value={startTime}
              onChange={handleStartTimeChange}
              className="time-input touch-manipulation"
            />
          </div>
        </div>
        <div className="flex w-full flex-col gap-2">
          <Label htmlFor="time-to" className="label-text">End Time</Label>
          <div className="relative flex w-full items-center gap-2">
            <Clock2Icon className="text-muted-foreground pointer-events-none absolute left-2.5 size-4 select-none" />
            <Input
              id="time-to"
              type="time"
              step="1"
              value={endTime}
              onChange={handleEndTimeChange}
              className="time-input touch-manipulation"
            />
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
