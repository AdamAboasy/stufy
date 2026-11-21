"use client";

import useSWR from "swr";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/feedback";
import { useI18n } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils";
import type { ActivityLog } from "@/types";

export default function AdminLogsPage() {
  const { t, lang } = useI18n();
  const { data } = useSWR<{ items: ActivityLog[] }>("/admin/logs");
  if (!data) return <PageLoader />;

  return (
    <div>
      <PageHeader title={t("nav.logs")} />
      <div className="space-y-2">
        {data.items.map((l) => (
          <Card key={l.id} className="flex flex-wrap justify-between gap-2 text-sm">
            <div>
              <p className="font-medium">
                {l.actorName} · {l.action}
              </p>
              <p className="text-muted">{l.targetId}</p>
            </div>
            <span className="text-muted">{formatDateTime(l.timestamp, lang)}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}
