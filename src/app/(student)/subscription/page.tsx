"use client";

import useSWR from "swr";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/feedback";
import { useI18n } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils";
import type { Subscription } from "@/types";

export default function SubscriptionPage() {
  const { t, lang } = useI18n();
  const { data } = useSWR<{ subscription: Subscription | null }>("/subscription");
  if (!data) return <PageLoader />;
  const s = data.subscription;

  return (
    <div>
      <PageHeader title={t("subscription.title")} />
      {!s ? (
        <Card className="mx-auto max-w-xl">{t("common.empty")}</Card>
      ) : (
        <Card className="mx-auto max-w-xl space-y-1">
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-muted">{t("subscription.plan")}</span>
            <span className="text-sm font-medium">{t(`subscription.${s.planType}`)}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-muted">{t("subscription.status")}</span>
            <Badge tone={statusTone(s.status)}>{t(`subscription.${s.status}`)}</Badge>
          </div>
          <div className="flex items-center justify-between border-t border-border py-3 text-sm">
            <span className="text-muted">{t("subscription.started")}</span>
            <span>{formatDateTime(s.startedAt, lang)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-border py-3 text-sm">
            <span className="text-muted">{t("subscription.expires")}</span>
            <span>{formatDateTime(s.expiresAt, lang)}</span>
          </div>
          {s.status !== "active" ? (
            <p className="pt-2 text-sm text-muted">{t("subscription.expiredHint")}</p>
          ) : null}
        </Card>
      )}
    </div>
  );
}
