"use client";

import Link from "next/link";
import useSWR from "swr";
import { BookOpen, Library, Timer } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/feedback";
import { useI18n } from "@/lib/i18n";
import { formatDate, formatMinutes } from "@/lib/utils";
import type { AppNotification, StudyPlan, StudyTask, Subscription } from "@/types";

export default function DashboardPage() {
  const { t, lang } = useI18n();
  const { data, error, mutate } = useSWR<{
    profile: { fullName: string };
    todayTasks: StudyTask[];
    overdueTasks: StudyTask[];
    plans: StudyPlan[];
    notifications: AppNotification[];
    subscription: Subscription | null;
    stats: {
      today: { completionPercent: number; pagesCompleted: number; remainingTasks: number };
      week: { studyMinutes: number };
      overall: { delayedTasks: number };
    };
  }>("/dashboard");

  if (error) return <ErrorState message={error.message} onRetry={() => mutate()} />;
  if (!data) return <PageLoader />;

  const stats = [
    { label: t("dashboard.completion"), value: `${data.stats.today.completionPercent}%` },
    { label: t("dashboard.weekly"), value: formatMinutes(data.stats.week.studyMinutes, lang) },
    { label: t("dashboard.pages"), value: data.stats.today.pagesCompleted },
    { label: t("dashboard.remaining"), value: data.stats.today.remainingTasks },
    { label: t("dashboard.overdue"), value: data.stats.overall.delayedTasks },
  ];

  return (
    <div>
      <PageHeader
        title={t("dashboard.welcome", { name: data.profile.fullName.split(" ")[0] })}
        subtitle={t("brand.subtitle")}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="mt-2 text-2xl font-semibold">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">{t("dashboard.todayTasks")}</h2>
            <Link href="/tasks" className="text-sm text-primary">
              {t("common.view")}
            </Link>
          </div>
          {data.todayTasks.length === 0 ? (
            <EmptyState title={t("dashboard.noTasks")} />
          ) : (
            <ul className="space-y-2">
              {data.todayTasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between rounded-xl bg-surface-muted px-3 py-3">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-xs text-muted">
                      {t("tasks.pages", { start: task.pageStart, end: task.pageEnd })} · {formatMinutes(task.estimatedDuration, lang)}
                    </p>
                  </div>
                  <Badge tone={statusTone(task.status)}>{t(`status.${task.status}`)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-semibold">{t("dashboard.quick")}</h2>
            <div className="grid gap-2">
              <Button asChild variant="outline">
                <Link href="/library">
                  <Library className="size-4" /> {t("dashboard.upload")}
                </Link>
              </Button>
              <Button asChild>
                <Link href="/plans/new">
                  <BookOpen className="size-4" /> {t("dashboard.newPlan")}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/routine">
                  <Timer className="size-4" /> {t("dashboard.addRoutine")}
                </Link>
              </Button>
            </div>
          </Card>
          <Card>
            <h2 className="mb-3 font-semibold">{t("dashboard.subscription")}</h2>
            {data.subscription ? (
              <div>
                <Badge tone={statusTone(data.subscription.status)}>
                  {t(`subscription.${data.subscription.status}`)}
                </Badge>
                <p className="mt-2 text-sm text-muted">
                  {t("dashboard.expiresOn", { date: formatDate(data.subscription.expiresAt, lang) })}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">—</p>
            )}
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">{t("dashboard.activePlans")}</h2>
          {data.plans.length === 0 ? (
            <p className="text-sm text-muted">{t("plans.noPlans")}</p>
          ) : (
            <ul className="space-y-2">
              {data.plans.map((p) => (
                <li key={p.id}>
                  <Link href={`/plans/${p.id}`} className="flex items-center justify-between rounded-xl px-2 py-2 hover:bg-surface-muted">
                    <span>{p.title}</span>
                    <span className="text-xs text-muted">
                      {p.completedTasks}/{p.totalTasks}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">{t("dashboard.recent")}</h2>
          {data.notifications.length === 0 ? (
            <p className="text-sm text-muted">{t("notifications.empty")}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.notifications.slice(0, 5).map((n) => (
                <li key={n.id} className="rounded-xl bg-surface-muted px-3 py-2">
                  <p className="font-medium">{n.title}</p>
                  <p className="text-muted">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
