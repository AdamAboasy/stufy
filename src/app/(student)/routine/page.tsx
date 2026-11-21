"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { EmptyState, PageLoader } from "@/components/ui/feedback";
import { useI18n } from "@/lib/i18n";
import { api, ApiRequestError } from "@/lib/api";
import { WEEKDAY_KEYS } from "@/lib/constants";
import type { RepeatType, Routine } from "@/types";

const empty = {
  title: "",
  startTime: "08:00",
  endTime: "14:00",
  repeatType: "weekdays" as RepeatType,
  repeatDays: [0, 1, 2, 3, 4],
  customDates: [] as string[],
  description: "",
  isActive: true,
};

export default function RoutinePage() {
  const { t } = useI18n();
  const { data, mutate } = useSWR<{ items: Routine[] }>("/routines");
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);

  if (!data) return <PageLoader />;

  async function save() {
    try {
      if (editing) {
        await api(`/routines/${editing}`, { method: "PATCH", body: JSON.stringify(form) });
      } else {
        await api("/routines", { method: "POST", body: JSON.stringify(form) });
      }
      setForm(empty);
      setEditing(null);
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : t("common.error"));
    }
  }

  async function remove(id: string) {
    if (!confirm(t("common.delete"))) return;
    await api(`/routines/${id}`, { method: "DELETE" });
    mutate();
  }

  return (
    <div>
      <PageHeader title={t("routine.title")} subtitle={t("routine.subtitle")} />
      <Card className="mb-6 space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>{t("routine.activity")}</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>{t("routine.start")}</Label>
              <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div>
              <Label>{t("routine.end")}</Label>
              <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["daily", "weekdays", "once"] as RepeatType[]).map((r) => (
            <Button key={r} size="sm" variant={form.repeatType === r ? "default" : "outline"} onClick={() => setForm({ ...form, repeatType: r })}>
              {t(`routine.${r === "weekdays" ? "weekdays" : r}`)}
            </Button>
          ))}
        </div>
        {form.repeatType !== "daily" && form.repeatType !== "once" ? (
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_KEYS.map((key, idx) => (
              <button
                key={key}
                type="button"
                className={`rounded-lg px-3 py-1 text-sm ${form.repeatDays.includes(idx) ? "bg-primary text-white" : "bg-surface-muted"}`}
                onClick={() =>
                  setForm({
                    ...form,
                    repeatDays: form.repeatDays.includes(idx)
                      ? form.repeatDays.filter((d) => d !== idx)
                      : [...form.repeatDays, idx],
                  })
                }
              >
                {t(`weekdays.${key}`)}
              </button>
            ))}
          </div>
        ) : null}
        {form.repeatType === "once" ? (
          <Input
            type="date"
            onChange={(e) => setForm({ ...form, customDates: e.target.value ? [e.target.value] : [] })}
          />
        ) : null}
        <Textarea
          placeholder={t("routine.description")}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <Button onClick={save}>{editing ? t("common.save") : t("common.add")}</Button>
      </Card>
      <p className="mb-4 text-sm text-muted">{t("routine.recalcHint")}</p>
      {data.items.length === 0 ? (
        <EmptyState title={t("routine.empty")} />
      ) : (
        <div className="grid gap-3">
          {data.items.map((r) => (
            <Card key={r.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{r.title}</p>
                <p className="text-sm text-muted">
                  {r.startTime}–{r.endTime} · {t(`routine.${r.repeatType === "weekdays" ? "weekdays" : r.repeatType}`)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(r.id);
                    setForm({
                      title: r.title,
                      startTime: r.startTime,
                      endTime: r.endTime,
                      repeatType: r.repeatType,
                      repeatDays: r.repeatDays,
                      customDates: r.customDates,
                      description: r.description,
                      isActive: r.isActive,
                    });
                  }}
                >
                  {t("common.edit")}
                </Button>
                <Button size="sm" variant="danger" onClick={() => remove(r.id)}>
                  {t("common.delete")}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
