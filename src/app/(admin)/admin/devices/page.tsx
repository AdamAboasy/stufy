"use client";

import useSWR from "swr";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/feedback";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { DeviceChangeRequest } from "@/types";

export default function AdminDevicesPage() {
  const { t, lang } = useI18n();
  const { data, mutate } = useSWR<{ items: DeviceChangeRequest[] }>("/admin/devices?status=pending");
  if (!data) return <PageLoader />;

  async function resolve(requestId: string, approve: boolean) {
    await api("/admin/devices", { method: "POST", body: JSON.stringify({ requestId, approve }) });
    mutate();
    toast.success(approve ? t("common.approve") : t("common.reject"));
  }

  return (
    <div>
      <PageHeader title={t("nav.devices")} />
      <div className="space-y-3">
        {data.items.map((r) => (
          <Card key={r.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-medium">{r.studentName}</p>
              <Badge tone={statusTone(r.status)}>{t(`status.${r.status}`)}</Badge>
            </div>
            <p className="text-sm text-muted">
              {t("admin.oldDevice")}: {r.currentDeviceName || "—"}
            </p>
            <p className="text-sm text-muted">
              {t("admin.newDevice")}: {r.requestedDeviceName}
            </p>
            <p className="text-xs text-muted">{formatDateTime(r.createdAt, lang)}</p>
            {r.status === "pending" ? (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => resolve(r.id, true)}>
                  {t("common.approve")}
                </Button>
                <Button size="sm" variant="danger" onClick={() => resolve(r.id, false)}>
                  {t("common.reject")}
                </Button>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
