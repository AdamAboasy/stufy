"use client";

import useSWR from "swr";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { PageLoader, ErrorState } from "@/components/ui/feedback";
import { useI18n } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils";
import type { ActivityLog } from "@/types";

export default function AdminOverviewPage() {
  const { t, lang } = useI18n();
  const { data, error, mutate } = useSWR<{
    totalStudents: number;
    activeSubscriptions: number;
    expiredSubscriptions: number;
    availableCodes: number;
    activeCodes: number;
    suspendedAccounts: number;
    pendingDeviceRequests: number;
    recentActivities: ActivityLog[];
  }>("/admin/overview");

  if (error) return <ErrorState message={error.message} onRetry={() => mutate()} />;
  if (!data) return <PageLoader />;

  const cards = [
    { label: t("nav.students"), value: data.totalStudents },
    { label: t("admin.active"), value: data.activeSubscriptions },
    { label: t("status.expired"), value: data.expiredSubscriptions },
    { label: t("admin.available"), value: data.availableCodes },
    { label: t("nav.codes"), value: data.activeCodes },
    { label: t("status.suspended"), value: data.suspendedAccounts },
    { label: t("admin.pending"), value: data.pendingDeviceRequests },
  ];

  return (
    <div>
      <PageHeader title={t("admin.overview")} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <p className="text-xs text-muted">{c.label}</p>
            <p className="mt-2 text-3xl font-semibold">{c.value}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-6">
        <h3 className="mb-4 font-semibold">{t("nav.logs")}</h3>
        <ul className="space-y-2 text-sm">
          {data.recentActivities.map((l) => (
            <li key={l.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-surface-muted px-3 py-2">
              <span>
                {l.actorName} · {l.action}
              </span>
              <span className="text-muted">{formatDateTime(l.timestamp, lang)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
