"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/feedback";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { formatMinutes, ymdInZone } from "@/lib/utils";
import type { StudyTask } from "@/types";

export default function TasksPage() {
  const { t, lang } = useI18n();
  const today = ymdInZone(new Date());
  const { data, error, mutate } = useSWR<{ items: StudyTask[] }>(`/tasks?date=${today}`);
  const [session, setSession] = useState<{ taskId: string; sessionId: string } | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  if (error) return <ErrorState message={error.message} onRetry={() => mutate()} />;
  if (!data) return <PageLoader />;

  async function start(task: StudyTask) {
    const result = await api<{ sessionId: string }>(`/tasks/${task.id}`, { method: "POST" });
    setSession({ taskId: task.id, sessionId: result.sessionId });
    mutate();
  }

  async function stop(complete: boolean) {
    if (!session) return;
    await api(`/sessions/${session.sessionId}`, {
      method: "POST",
      body: JSON.stringify({ complete }),
    });
    setSession(null);
    mutate();
  }

  async function patch(id: string, body: Record<string, unknown>) {
    await api(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    mutate();
  }

  return (
    <div>
      <PageHeader title={t("tasks.title")} />
      {session ? (
        <Card className="mb-4 flex items-center justify-between border-primary/40">
          <p className="font-medium">{t("tasks.sessionOn")}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => stop(false)}>
              {t("tasks.pause")}
            </Button>
            <Button onClick={() => stop(true)}>{t("tasks.complete")}</Button>
          </div>
        </Card>
      ) : null}
      {data.items.length === 0 ? (
        <EmptyState title={t("tasks.empty")} />
      ) : (
        <div className="space-y-3">
          {data.items.map((task) => (
            <Card key={task.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold">{task.title}</h3>
                  <p className="text-sm text-muted">
                    {task.chapter} · {t("tasks.pages", { start: task.pageStart, end: task.pageEnd })}
                  </p>
                  <p className="text-xs text-muted">
                    {t("tasks.estimated")}: {formatMinutes(task.estimatedDuration, lang)} · {t("tasks.actual")}: {formatMinutes(task.actualDuration, lang)}
                  </p>
                </div>
                <Badge tone={statusTone(task.status)}>{t(`status.${task.status}`)}</Badge>
              </div>
              <Textarea
                className="mt-3"
                placeholder={t("tasks.notes")}
                defaultValue={task.notes}
                onBlur={(e) => {
                  if (e.target.value !== task.notes) void patch(task.id, { notes: e.target.value });
                }}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {task.status !== "completed" && !session ? (
                  <Button size="sm" onClick={() => start(task)}>
                    {t("tasks.start")}
                  </Button>
                ) : null}
                {task.status !== "completed" ? (
                  <>
                    <Button size="sm" variant="success" onClick={() => patch(task.id, { status: "completed" })}>
                      {t("tasks.complete")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => patch(task.id, { status: "delayed" })}>
                      {t("tasks.delay")}
                    </Button>
                  </>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
