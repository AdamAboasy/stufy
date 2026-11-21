"use client";

import { useParams } from "next/navigation";
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
import type { Device, StudentProfile, Subscription } from "@/types";

export default function AdminStudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useI18n();
  const { data, mutate } = useSWR<{ student: StudentProfile; subscription: Subscription | null; device: Device | null }>(
    `/admin/students/${id}`,
  );
  if (!data) return <PageLoader />;

  async function setStatus(accountStatus: "active" | "suspended") {
    await api(`/admin/students/${id}`, { method: "PATCH", body: JSON.stringify({ accountStatus }) });
    mutate();
    toast.success(t("common.save"));
  }

  return (
    <div>
      <PageHeader title={data.student.fullName} subtitle={data.student.phoneNumber} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-2">
          <p>
            {t("common.status")}: <Badge tone={statusTone(data.student.accountStatus)}>{t(`status.${data.student.accountStatus}`)}</Badge>
          </p>
          <div className="flex gap-2">
            <Button variant="danger" onClick={() => setStatus("suspended")}>
              {t("common.suspend")}
            </Button>
            <Button variant="success" onClick={() => setStatus("active")}>
              {t("common.restore")}
            </Button>
          </div>
        </Card>
        <Card>
          <h3 className="mb-2 font-semibold">{t("nav.subscription")}</h3>
          {data.subscription ? (
            <p className="text-sm">
              {t(`subscription.${data.subscription.planType}`)} · {t(`status.${data.subscription.status}`)}
              <br />
              {formatDateTime(data.subscription.expiresAt, lang)}
            </p>
          ) : (
            "—"
          )}
        </Card>
        <Card>
          <h3 className="mb-2 font-semibold">{t("admin.device")}</h3>
          <p className="text-sm">{data.device?.deviceName || "—"}</p>
        </Card>
      </div>
    </div>
  );
}
