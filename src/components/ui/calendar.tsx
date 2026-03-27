"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { DayPicker, type DayPickerProps, UI } from "react-day-picker";

import { cn } from "@/lib/utils";

import "react-day-picker/style.css";

import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = DayPickerProps;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "rdp-root rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-100 [--rdp-accent-color:#38bdf8] [--rdp-accent-background-color:#27272a] [--rdp-day_button-height:2rem] [--rdp-day_button-width:2rem] [--rdp-nav-height:2rem] [--rdp-nav_button-height:2rem] [--rdp-nav_button-width:2rem]",
        className,
      )}
      classNames={{
        [UI.Months]: "flex flex-col gap-4 sm:flex-row",
        [UI.Month]: "gap-2",
        [UI.MonthCaption]:
          "relative mb-2 flex w-full items-center justify-center py-0",
        [UI.CaptionLabel]: "text-sm font-medium text-zinc-200",
        [UI.Nav]: "absolute end-0 top-0 z-10 flex items-center gap-0.5",
        [UI.PreviousMonthButton]: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "relative !h-8 !w-8 border-zinc-700 bg-zinc-900 p-0 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-50",
        ),
        [UI.NextMonthButton]: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "relative !h-8 !w-8 border-zinc-700 bg-zinc-900 p-0 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-50",
        ),
        [UI.MonthGrid]: "w-full border-collapse",
        [UI.Weekdays]: "flex",
        [UI.Weekday]: "w-8 text-center text-[11px] font-normal text-zinc-500",
        [UI.Week]: "mt-1 flex w-full",
        [UI.Day]: "size-8 p-0 text-center text-sm focus-within:relative focus-within:z-20",
        [UI.DayButton]: cn(
          buttonVariants({ variant: "ghost" }),
          "size-8 p-0 font-normal text-zinc-200 aria-selected:opacity-100",
        ),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" aria-hidden />
          ) : (
            <ChevronRight className="size-4" aria-hidden />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
