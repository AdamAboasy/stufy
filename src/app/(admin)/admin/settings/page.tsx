"use client";

import useSWR from "swr";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/feedback";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";

export default function AdminSettingsPage() {
  const { t } = useI18n();
  const { data, mutate } = useSWR<{
    settings: {
      maintenanceMode: boolean;
      allowRegistrations: boolean;
      maxFileSizeMb: number;
      subscriptionReminderDays: number;
    };
  }>("/admin/settings");
  if (!data) return <PageLoader />;
  const s = data.settings;

  async function save(patch: Record<string, unknown>) {
    await api("/admin/settings", { method: "PATCH", body: JSON.stringify(patch) });
    mutate();
    toast.success(t("common.save"));
  }

  return (
    <div>
      <PageHeader title={t("nav.adminSettings")} />
      <Card className="max-w-lg space-y-4">
        <label className="flex items-center justify-between">
          <span>Maintenance mode</span>
          <input
            type="checkbox"
            checked={Boolean(s.maintenanceMode)}
            onChange={(e) => save({ maintenanceMode: e.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between">
          <span>Allow registrations</span>
          <input
            type="checkbox"
            checked={s.allowRegistrations !== false}
            onChange={(e) => save({ allowRegistrations: e.target.checked })}
          />
        </label>
        <div>
          <Label>Max file size (MB)</Label>
          <Input
            type="number"
            defaultValue={s.maxFileSizeMb || 25}
            onBlur={(e) => save({ maxFileSizeMb: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>Subscription reminder days</Label>
          <Input
            type="number"
            defaultValue={s.subscriptionReminderDays || 3}
            onBlur={(e) => save({ subscriptionReminderDays: Number(e.target.value) })}
          />
        </div>
        <Button onClick={() => save(s)}>{t("common.save")}</Button>
      </Card>
    </div>
  );
}
