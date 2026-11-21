"use client";

import useSWR from "swr";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageLoader } from "@/components/ui/feedback";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { AppNotification } from "@/types";

export default function NotificationsPage() {
  const { t, lang } = useI18n();
  const { data, mutate } = useSWR<{ items: AppNotification[] }>("/notifications");
  if (!data) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title={t("notifications.title")}
        actions={
          <Button
            variant="outline"
            onClick={async () => {
              await api("/notifications", { method: "POST", body: JSON.stringify({ all: true }) });
              mutate();
            }}
          >
            {t("notifications.markAll")}
          </Button>
        }
      />
      {data.items.length === 0 ? (
        <EmptyState title={t("notifications.empty")} />
      ) : (
        <div className="space-y-3">
          {data.items.map((n) => (
            <Card
              key={n.id}
              className={n.read ? "opacity-70" : ""}
              onClick={async () => {
                if (!n.read) {
                  await api("/notifications", { method: "POST", body: JSON.stringify({ id: n.id }) });
                  mutate();
                }
              }}
            >
              <p className="font-medium">{n.title}</p>
              <p className="text-sm text-muted">{n.body}</p>
              <p className="mt-1 text-xs text-muted">{formatDateTime(n.createdAt, lang)}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
