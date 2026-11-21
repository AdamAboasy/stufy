"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/feedback";
import { useI18n } from "@/lib/i18n";
import type { StudentProfile } from "@/types";

export default function AdminStudentsPage() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const { data } = useSWR<{ items: StudentProfile[] }>(`/admin/students?q=${encodeURIComponent(q)}`);
  if (!data) return <PageLoader />;

  return (
    <div>
      <PageHeader title={t("admin.students")} />
      <Input className="mb-4 max-w-md" placeholder={t("common.search")} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="space-y-2">
        {data.items.map((s) => (
          <Link key={s.uid} href={`/admin/students/${s.uid}`}>
            <Card className="flex items-center justify-between">
              <div>
                <p className="font-medium">{s.fullName}</p>
                <p className="text-sm text-muted">{s.phoneNumber}</p>
              </div>
              <Badge tone={statusTone(s.accountStatus)}>{t(`status.${s.accountStatus}`)}</Badge>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
