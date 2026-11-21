"use client";

import { useState } from "react";
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
import type { PlanType, Subscription } from "@/types";

export default function AdminSubscriptionsPage() {
  const { t, lang } = useI18n();
  const [status, setStatus] = useState("");
  const { data, mutate } = useSWR<{ items: Subscription[] }>(
    `/admin/subscriptions${status ? `?status=${status}` : ""}`,
  );
  if (!data) return <PageLoader />;

  async function act(subscriptionId: string, action: string, planType?: PlanType) {
    await api("/admin/subscriptions", {
      method: "POST",
      body: JSON.stringify({ subscriptionId, action, planType }),
    });
    mutate();
    toast.success(t("common.save"));
  }

  return (
    <div>
      <PageHeader title={t("nav.subscriptions")} />
      <div className="mb-4 flex gap-2">
        {["", "active", "expired", "suspended"].map((s) => (
          <Button key={s || "all"} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>
            {s ? t(`status.${s}`) : t("common.all")}
          </Button>
        ))}
      </div>
      <div className="space-y-2">
        {data.items.map((s) => (
          <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{s.studentName || s.studentId}</p>
              <p className="text-xs text-muted">
                {t(`subscription.${s.planType}`)} · {formatDateTime(s.expiresAt, lang)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={statusTone(s.status)}>{t(`status.${s.status}`)}</Badge>
              <select
                className="h-8 rounded-lg border border-border bg-surface px-2 text-xs"
                defaultValue={s.planType}
                onChange={(e) => act(s.id, "renew", e.target.value as PlanType)}
              >
                <option value="weekly">{t("common.renew")} · 7</option>
                <option value="monthly">{t("common.renew")} · 30</option>
                <option value="quarterly">{t("common.renew")} · 90</option>
                <option value="yearly">{t("common.renew")} · 365</option>
              </select>
              <Button size="sm" variant="outline" onClick={() => act(s.id, "suspend")}>
                {t("common.suspend")}
              </Button>
              <Button size="sm" variant="danger" onClick={() => act(s.id, "revoke")}>
                {t("common.revoke")}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
