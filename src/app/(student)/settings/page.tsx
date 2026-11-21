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
import { WEEKDAY_KEYS } from "@/lib/constants";
import { useTheme } from "next-themes";
import type { StudentProfile } from "@/types";

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const { data, mutate } = useSWR<{ profile: StudentProfile }>("/profile");

  if (!data) return <PageLoader />;
  const p = data.profile;

  async function save(patch: Partial<StudentProfile>) {
    await api("/profile", { method: "PATCH", body: JSON.stringify(patch) });
    mutate();
    toast.success(t("common.save"));
  }

  return (
    <div>
      <PageHeader title={t("settings.title")} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <Label>{t("settings.language")}</Label>
          <div className="mt-2 flex gap-2">
            {(["ar", "en"] as const).map((l) => (
              <Button
                key={l}
                variant={lang === l ? "default" : "outline"}
                onClick={() => {
                  document.cookie = `stufy_lang=${l};path=/;max-age=31536000`;
                  void save({ preferredLanguage: l });
                  window.location.reload();
                }}
              >
                {l === "ar" ? t("common.arabic") : t("common.english")}
              </Button>
            ))}
          </div>
        </Card>
        <Card>
          <Label>{t("settings.theme")}</Label>
          <div className="mt-2 flex gap-2">
            {(["light", "dark", "system"] as const).map((th) => (
              <Button key={th} variant={theme === th ? "default" : "outline"} onClick={() => { setTheme(th); void save({ theme: th }); }}>
                {t(`common.${th}`)}
              </Button>
            ))}
          </div>
        </Card>
        <Card className="md:col-span-2">
          <Label>{t("settings.restDays")}</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {WEEKDAY_KEYS.map((key, idx) => (
              <button
                key={key}
                className={`rounded-lg px-3 py-1.5 text-sm ${(p.restDays || []).includes(idx) ? "bg-primary text-white" : "bg-surface-muted"}`}
                onClick={() => {
                  const next = (p.restDays || []).includes(idx)
                    ? p.restDays.filter((d) => d !== idx)
                    : [...(p.restDays || []), idx];
                  void save({ restDays: next });
                }}
              >
                {t(`weekdays.${key}`)}
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <Label>{t("settings.daily")}</Label>
          <Input
            type="number"
            defaultValue={p.dailyStudyMinutes}
            onBlur={(e) => save({ dailyStudyMinutes: Number(e.target.value) })}
          />
        </Card>
        <Card>
          <Label>{t("settings.session")}</Label>
          <Input
            type="number"
            defaultValue={p.preferredSessionMinutes}
            onBlur={(e) => save({ preferredSessionMinutes: Number(e.target.value) })}
          />
        </Card>
      </div>
    </div>
  );
}
