"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Copy, Download, KeyRound, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Badge, statusTone } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/feedback";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { ActivationCode, GeneratedCode, PlanType } from "@/types";

const FILTERS = ["", "available", "active", "revoked", "suspended"] as const;

export default function AdminCodesPage() {
  const { t, lang } = useI18n();
  const [planType, setPlanType] = useState<PlanType>("monthly");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [generated, setGenerated] = useState<GeneratedCode[]>([]);
  const [status, setStatus] = useState<(typeof FILTERS)[number]>("");
  const { data, mutate } = useSWR<{ items: ActivationCode[] }>(
    `/admin/codes${status ? `?status=${status}` : ""}`,
  );

  async function generate() {
    const result = await api<{ codes: GeneratedCode[] }>("/admin/codes", {
      method: "POST",
      body: JSON.stringify({ planType, quantity, notes }),
    });
    setGenerated(result.codes);
    mutate();
    toast.success(t("admin.generateCodes"));
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success(t("common.copied"));
  }

  async function exportXlsx() {
    const blob = await api<Blob>("/admin/codes?export=1", {
      method: "POST",
      body: JSON.stringify({
        codes: generated.map((c) => ({ plaintext: c.plaintext, planType: c.planType })),
      }),
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "study-managment-codes.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!data) return <PageLoader />;

  return (
    <div>
      <PageHeader title={t("nav.codes")} subtitle={t("admin.codesHint")} />

      <Card className="mb-6">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="size-4" />
          <h3 className="font-semibold">{t("admin.generateCodes")}</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>{t("admin.planType")}</Label>
            <select
              className="flex h-11 w-full appearance-none rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
              value={planType}
              onChange={(e) => setPlanType(e.target.value as PlanType)}
            >
              <option value="weekly">{t("subscription.weekly")}</option>
              <option value="monthly">{t("subscription.monthly")}</option>
              <option value="quarterly">{t("subscription.quarterly")}</option>
              <option value="yearly">{t("subscription.yearly")}</option>
            </select>
          </div>
          <div>
            <Label>{t("admin.quantity")}</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={quantity}
              className="h-11 text-base"
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>{t("common.notes")}</Label>
            <Input
              value={notes}
              className="h-11 text-base"
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={generate} className="mt-4">
          <Plus className="size-4" />
          {t("common.generate")}
        </Button>

        {generated.length ? (
          <div className="mt-5 rounded-2xl border border-border bg-surface-muted p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => copy(generated.map((c) => c.plaintext).join("\n"))}>
                <Copy className="size-4" />
                {t("admin.copyBatch")}
              </Button>
              <Button size="sm" variant="outline" onClick={exportXlsx}>
                <Download className="size-4" />
                {t("admin.exportExcel")}
              </Button>
              <span className="ms-auto self-center text-xs text-muted">
                {generated.length} {t("admin.codes")}
              </span>
            </div>
            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {generated.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-lg bg-surface px-3 py-2"
                >
                  <span className="font-mono text-sm tracking-wider">{c.plaintext}</span>
                  <Button size="sm" variant="ghost" onClick={() => copy(c.plaintext)}>
                    <Copy className="size-3.5" />
                    {t("common.copy")}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      <div className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map((s) => (
          <Button
            key={s || "all"}
            size="sm"
            variant={status === s ? "default" : "outline"}
            onClick={() => setStatus(s)}
          >
            {s ? t(`status.${s}`) : t("common.all")}
          </Button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="hidden grid-cols-[1.4fr_1fr_1fr_auto] gap-4 border-b border-border bg-surface-muted px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted sm:grid">
          <span>{t("admin.code")}</span>
          <span>{t("admin.planType")}</span>
          <span>{t("common.created")}</span>
          <span className="text-end">{t("common.status")}</span>
        </div>
        {data.items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">{t("common.empty")}</p>
        ) : (
          <ul>
            {data.items.map((c) => (
              <li
                key={c.id}
                className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-0 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:gap-4"
              >
                <span className="font-mono text-sm tracking-wider">{c.codePrefix}••••</span>
                <span className="hidden text-sm text-muted sm:block">
                  {t(`subscription.${c.planType}`)}
                </span>
                <span className="hidden text-sm text-muted sm:block">
                  {formatDateTime(c.createdAt, lang)}
                </span>
                <div className="flex items-center justify-end gap-2">
                  <Badge tone={statusTone(c.status)}>{t(`status.${c.status}`)}</Badge>
                  {c.status === "available" ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          api(`/admin/codes/${c.id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ status: "suspended" }),
                          }).then(() => mutate())
                        }
                      >
                        {t("common.suspend")}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() =>
                          api(`/admin/codes/${c.id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ status: "revoked" }),
                          }).then(() => mutate())
                        }
                      >
                        {t("common.revoke")}
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
