"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { api, ApiRequestError } from "@/lib/api";

export default function ActivatePage() {
  const { t } = useI18n();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api("/auth/validate-code", { method: "POST", body: JSON.stringify({ code }) });
      router.push("/register");
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : t("auth.invalidCode"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-8 lg:hidden">
        <Logo />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">{t("auth.activateTitle")}</h1>
      <p className="mt-2 text-sm text-muted">{t("auth.activateHint")}</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="code">{t("auth.code")}</Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="STUFY-XXXX-XXXX-XXXX"
            autoComplete="off"
            className="h-12 text-base tracking-widest"
            required
          />
        </div>
        <Button className="w-full" size="lg" disabled={loading}>
          {loading ? t("common.loading") : t("auth.continue")}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="font-medium text-primary">
          {t("auth.signIn")}
        </Link>
      </p>
    </div>
  );
}
