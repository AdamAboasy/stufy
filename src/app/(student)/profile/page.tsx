"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/feedback";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import type { StudentProfile } from "@/types";

export default function ProfilePage() {
  const { t } = useI18n();
  const { data, mutate } = useSWR<{ profile: StudentProfile }>("/profile");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (data?.profile) setFullName(data.profile.fullName);
  }, [data]);

  if (!data) return <PageLoader />;

  return (
    <div>
      <PageHeader title={t("profile.title")} subtitle={t("profile.subtitle")} />
      <Card className="max-w-lg space-y-4">
        <div>
          <Label>{t("auth.fullName")}</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <Label>{t("auth.phone")}</Label>
          <Input value={data.profile.phoneNumber} disabled />
        </div>
        <Button
          onClick={async () => {
            await api("/profile", { method: "PATCH", body: JSON.stringify({ fullName }) });
            mutate();
            toast.success(t("common.save"));
          }}
        >
          {t("common.save")}
        </Button>
      </Card>
    </div>
  );
}
