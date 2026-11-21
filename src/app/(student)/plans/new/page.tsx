"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { EmptyState, PageLoader } from "@/components/ui/feedback";
import { useI18n } from "@/lib/i18n";
import { api, ApiRequestError } from "@/lib/api";
import { formatMinutes, ymdInZone } from "@/lib/utils";
import { WEEKDAY_KEYS } from "@/lib/constants";
import type { PlanPreview, UploadedFile } from "@/types";

export default function NewPlanPage() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const { data } = useSWR<{ items: UploadedFile[] }>("/files");
  const today = ymdInZone(new Date());
  const [fileId, setFileId] = useState("");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState("");
  const [dailyStudyMinutes, setDaily] = useState(120);
  const [sessionMinutes, setSession] = useState(45);
  const [restDays, setRestDays] = useState<number[]>([5]);
  const [difficulty, setDifficulty] = useState<"balanced" | "easy_first" | "hard_first">("balanced");
  const [preview, setPreview] = useState<PlanPreview | null>(null);
  const [loading, setLoading] = useState(false);

  const readyFiles = useMemo(
    () => data?.items.filter((f) => f.processingStatus === "completed" || f.processingStatus === "requires_review") || [],
    [data],
  );

  async function makePreview() {
    setLoading(true);
    try {
      const result = await api<{ preview: PlanPreview }>("/plans?preview=1", {
        method: "POST",
        body: JSON.stringify({
          fileId,
          title: title || undefined,
          startDate,
          endDate,
          dailyStudyMinutes,
          sessionMinutes,
          restDays,
          difficultyPreference: difficulty,
        }),
      });
      setPreview(result.preview);
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    if (!preview) return;
    setLoading(true);
    try {
      const saved = await api<{ planId: string }>("/plans", {
        method: "POST",
        body: JSON.stringify({ preview, fileId }),
      });
      router.push(`/plans/${saved.planId}`);
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  if (!data) return <PageLoader />;
  if (!readyFiles.length) {
    return (
      <EmptyState
        title={t("library.noFiles")}
        description={t("plans.subtitle")}
        action={
          <Button asChild>
            <a href="/library">{t("dashboard.upload")}</a>
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader title={t("plans.create")} subtitle={t("plans.subtitle")} />
      <Card className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>{t("plans.file")}</Label>
            <select
              className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"
              value={fileId}
              onChange={(e) => setFileId(e.target.value)}
            >
              <option value="">—</option>
              {readyFiles.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.originalName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>{t("plans.title")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>{t("plans.start")}</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label>{t("plans.end")}</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div>
            <Label>{t("plans.hours")}</Label>
            <Input type="number" min={30} value={dailyStudyMinutes} onChange={(e) => setDaily(Number(e.target.value))} />
          </div>
          <div>
            <Label>{t("plans.session")}</Label>
            <Input type="number" min={15} value={sessionMinutes} onChange={(e) => setSession(Number(e.target.value))} />
          </div>
        </div>
        <div>
          <Label>{t("plans.rest")}</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {WEEKDAY_KEYS.map((key, idx) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setRestDays((d) => (d.includes(idx) ? d.filter((x) => x !== idx) : [...d, idx]))
                }
                className={`rounded-lg px-3 py-1.5 text-sm ${restDays.includes(idx) ? "bg-primary text-white" : "bg-surface-muted"}`}
              >
                {t(`weekdays.${key}`)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>{t("plans.difficulty")}</Label>
          <div className="mt-2 flex gap-2">
            {(["balanced", "easy_first", "hard_first"] as const).map((d) => (
              <Button key={d} type="button" variant={difficulty === d ? "default" : "outline"} size="sm" onClick={() => setDifficulty(d)}>
                {t(`plans.${d === "easy_first" ? "easyFirst" : d === "hard_first" ? "hardFirst" : "balanced"}`)}
              </Button>
            ))}
          </div>
        </div>
        <Button disabled={!fileId || !endDate || loading} onClick={makePreview}>
          {t("plans.preview")}
        </Button>
      </Card>

      {preview ? (
        <Card className="mt-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{preview.title}</h2>
            <p className="text-sm text-muted">
              {preview.totalChapters} {t("library.chapters")} · {preview.totalPages} {t("common.pages")}
            </p>
          </div>
          <p className="text-sm">{preview.explanation}</p>
          {preview.warnings.length ? (
            <ul className="list-disc ps-5 text-sm text-warning">
              {preview.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
          <div className="max-h-[420px] space-y-3 overflow-y-auto">
            {preview.days.map((day) => (
              <div key={day.date} className="rounded-xl bg-surface-muted p-3">
                <div className="mb-1 flex justify-between text-sm font-medium">
                  <span>{day.date}</span>
                  <span>
                    {day.isRestDay
                      ? t("calendar.restDay")
                      : formatMinutes(day.estimatedMinutes, lang)}
                  </span>
                </div>
                {day.tasks.map((task, i) => (
                  <p key={i} className="text-sm text-muted">
                    {task.title} · pp. {task.pageStart}–{task.pageEnd}
                  </p>
                ))}
              </div>
            ))}
          </div>
          <Button onClick={confirm} disabled={loading}>
            {t("plans.confirm")}
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
