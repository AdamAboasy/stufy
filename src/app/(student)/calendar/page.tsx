"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/feedback";
import { useI18n } from "@/lib/i18n";
import { addDaysYmd, ymdInZone } from "@/lib/utils";
import type { StudyTask } from "@/types";

export default function CalendarPage() {
  const { t, lang } = useI18n();
  const { data } = useSWR<{ items: StudyTask[] }>("/tasks");
  const [month, setMonth] = useState(() => ymdInZone(new Date()).slice(0, 7));
  const selectedDefault = ymdInZone(new Date());
  const [selected, setSelected] = useState(selectedDefault);

  const days = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const startWeekday = first.getUTCDay();
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const cells: Array<{ date: string | null }> = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ date: null });
    for (let d = 1; d <= last; d++) {
      cells.push({ date: `${month}-${String(d).padStart(2, "0")}` });
    }
    return cells;
  }, [month]);

  if (!data) return <PageLoader />;
  const byDate: Record<string, StudyTask[]> = {};
  for (const task of data.items) {
    (byDate[task.scheduledDate] ||= []).push(task);
  }
  const selectedTasks = byDate[selected] || [];

  return (
    <div>
      <PageHeader title={t("calendar.title")} subtitle={t("calendar.subtitle")} />
      <div className="mb-4 flex items-center gap-2">
        <button
          className="rounded-lg bg-surface-muted px-3 py-1 text-sm"
          onClick={() => setMonth(addDaysYmd(`${month}-01`, -1).slice(0, 7))}
        >
          {t("common.previous")}
        </button>
        <span className="font-medium">{month}</span>
        <button
          className="rounded-lg bg-surface-muted px-3 py-1 text-sm"
          onClick={() => setMonth(addDaysYmd(`${month}-28`, 10).slice(0, 7))}
        >
          {t("common.next")}
        </button>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted">
        {["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map((d) => (
          <div key={d}>{t(`weekdays.${d}`).slice(0, lang === "ar" ? 2 : 2)}</div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-2">
        {days.map((cell, i) => {
          if (!cell.date) return <div key={i} />;
          const count = byDate[cell.date]?.length || 0;
          const active = cell.date === selected;
          return (
            <button
              key={cell.date}
              onClick={() => setSelected(cell.date!)}
              className={`min-h-16 rounded-xl border p-2 text-start text-sm ${active ? "border-primary bg-primary/10" : "border-border bg-surface"}`}
            >
              <div className="font-medium">{Number(cell.date.slice(8))}</div>
              {count ? <div className="mt-1 text-[10px] text-primary">{count}</div> : null}
            </button>
          );
        })}
      </div>
      <Card className="mt-6">
        <h3 className="mb-3 font-semibold">{selected}</h3>
        {selectedTasks.length === 0 ? (
          <p className="text-sm text-muted">{t("tasks.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {selectedTasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between">
                <span>{task.title}</span>
                <Badge tone={statusTone(task.status)}>{t(`status.${task.status}`)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
