"use client";

import useSWR from "swr";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/feedback";
import { useI18n } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils";
import type { FileProcessingJob } from "@/types";

export default function AdminFilesPage() {
  const { t, lang } = useI18n();
  const { data } = useSWR<{ items: FileProcessingJob[] }>("/admin/files");
  if (!data) return <PageLoader />;

  return (
    <div>
      <PageHeader title={t("admin.jobs")} subtitle={t("admin.noAccessFiles")} />
      <div className="space-y-2">
        {data.items.map((j) => (
          <Card key={j.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium">{j.originalName}</p>
              <p className="text-xs text-muted">{formatDateTime(j.createdAt, lang)}</p>
            </div>
            <Badge tone={statusTone(j.status)}>{t(`status.${j.status}`)}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
