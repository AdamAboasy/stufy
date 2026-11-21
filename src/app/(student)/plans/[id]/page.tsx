"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ErrorState, PageLoader } from "@/components/ui/feedback";
import { useI18n } from "@/lib/i18n";
import { api, ApiRequestError } from "@/lib/api";
import { formatMinutes } from "@/lib/utils";
import type { PlanPreview, RescheduleProposal, StudyPlan, StudyTask } from "@/types";

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useI18n();
  const { data, error, mutate } = useSWR<{ plan: StudyPlan; tasks: StudyTask[] }>(`/plans/${id}`);
  const [proposal, setProposal] = useState<RescheduleProposal | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");

  if (error) return <ErrorState message={error.message} onRetry={() => mutate()} />;
  if (!data) return <PageLoader />;

  const byDate = new Map<string, StudyTask[]>();
  for (const task of data.tasks) {
    const list = byDate.get(task.scheduledDate) || [];
    list.push(task);
    byDate.set(task.scheduledDate, list);
  }

  async function reschedule() {
    try {
      const result = await api<{ proposal: RescheduleProposal }>(`/plans/${id}?action=reschedule`, {
        method: "POST",
      });
      setProposal(result.proposal);
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : t("common.error"));
    }
  }

  async function apply(preview: PlanPreview) {
    await api(`/plans/${id}?action=apply`, {
      method: "POST",
      body: JSON.stringify({ preview }),
    });
    setProposal(null);
    mutate();
    toast.success(t("plans.apply"));
  }

  async function addTask() {
    if (!title || !date) return;
    await api("/tasks", {
      method: "POST",
      body: JSON.stringify({ planId: id, title, scheduledDate: date, estimatedDuration: 30 }),
    });
    setTitle("");
    mutate();
  }

  async function move(task: StudyTask, scheduledDate: string) {
    if (task.status === "completed") return;
    await api(`/tasks/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({ scheduledDate }),
    });
    mutate();
  }

  return (
    <div>
      <PageHeader
        title={data.plan.title}
        subtitle={data.plan.explanation}
        actions={
          <Button variant="outline" onClick={reschedule}>
            {t("plans.reschedule")}
          </Button>
        }
      />
      {data.plan.warnings?.length ? (
        <Card className="mb-4 text-sm text-warning">
          {data.plan.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </Card>
      ) : null}

      {proposal ? (
        <Card className="mb-6 space-y-3">
          <h3 className="font-semibold">{t("plans.preview")}</h3>
          <p className="text-sm">{proposal.explanation}</p>
          <p className="text-xs text-muted">{t("plans.keepCompleted")}</p>
          <div className="flex gap-2">
            <Button onClick={() => apply(proposal.plan)}>{t("plans.apply")}</Button>
            <Button variant="outline" onClick={() => setProposal(null)}>
              {t("common.cancel")}
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="mb-6 flex flex-col gap-2 sm:flex-row">
        <Input placeholder={t("plans.addTask")} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button onClick={addTask}>{t("common.add")}</Button>
      </Card>

      <div className="space-y-4">
        {[...byDate.entries()].map(([day, tasks]) => (
          <Card key={day}>
            <h3 className="mb-3 font-semibold">{day}</h3>
            <ul className="space-y-2">
              {tasks.map((task) => (
                <li key={task.id} className="flex flex-col gap-2 rounded-xl bg-surface-muted p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-xs text-muted">
                      {t("tasks.pages", { start: task.pageStart, end: task.pageEnd })} · {formatMinutes(task.estimatedDuration, lang)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={statusTone(task.status)}>{t(`status.${task.status}`)}</Badge>
                    {task.status !== "completed" ? (
                      <Input
                        type="date"
                        className="h-9 w-36"
                        defaultValue={task.scheduledDate}
                        onBlur={(e) => {
                          if (e.target.value !== task.scheduledDate) void move(task, e.target.value);
                        }}
                      />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
