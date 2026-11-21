"use client";

import Link from "next/link";
import useSWR from "swr";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/feedback";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import type { StudyPlan } from "@/types";

export default function PlansPage() {
  const { t, lang } = useI18n();
  const { data, error, mutate } = useSWR<{ items: StudyPlan[] }>("/plans");
  if (error) return <ErrorState message={error.message} onRetry={() => mutate()} />;
  if (!data) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title={t("plans.title")}
        subtitle={t("plans.subtitle")}
        actions={
          <Button asChild>
            <Link href="/plans/new">{t("plans.create")}</Link>
          </Button>
        }
      />
      {data.items.length === 0 ? (
        <EmptyState
          title={t("plans.noPlans")}
          action={
            <Button asChild>
              <Link href="/plans/new">{t("plans.create")}</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.items.map((plan) => (
            <Link key={plan.id} href={`/plans/${plan.id}`}>
              <Card className="h-full transition hover:border-primary/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{plan.title}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {formatDate(plan.startDate, lang)} — {formatDate(plan.endDate, lang)}
                    </p>
                  </div>
                  <Badge tone={statusTone(plan.status)}>{t(`status.${plan.status}`)}</Badge>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${plan.totalTasks ? Math.round((plan.completedTasks / plan.totalTasks) * 100) : 0}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted">
                  {plan.completedTasks}/{plan.totalTasks} · {plan.totalPages} {t("common.pages")}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
