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

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [deviceMismatch, setDeviceMismatch] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await api<{
        deviceMismatch?: boolean;
        currentDeviceName?: string;
        user?: { role?: string };
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ phoneNumber, password }),
      });
      if (result.deviceMismatch) {
        setDeviceMismatch(result.currentDeviceName || "");
        return;
      }
      router.push(result.user?.role === "admin" ? "/admin" : "/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  async function requestChange() {
    try {
      await api("/auth/device-change", {
        method: "POST",
        body: JSON.stringify({ phoneNumber, password }),
      });
      setRequested(true);
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : t("common.error"));
    }
  }

  if (deviceMismatch !== null) {
    return (
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">{t("auth.deviceTitle")}</h1>
        <p className="mt-2 text-sm text-muted">{t("auth.deviceHint")}</p>
        {deviceMismatch ? (
          <p className="mt-4 rounded-xl bg-surface-muted p-3 text-sm">{deviceMismatch}</p>
        ) : null}
        {requested ? (
          <p className="mt-6 text-sm text-success">{t("auth.requestSent")}</p>
        ) : (
          <Button className="mt-6 w-full" size="lg" onClick={requestChange}>
            {t("auth.requestChange")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-8 lg:hidden">
        <Logo />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">{t("auth.loginTitle")}</h1>
      <p className="mt-2 text-sm text-muted">{t("auth.loginHint")}</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="phone">{t("auth.phone")}</Label>
          <Input
            id="phone"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="h-12 text-base"
            required
          />
        </div>
        <div>
          <Label htmlFor="password">{t("auth.password")}</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 text-base"
            required
          />
        </div>
        <Button className="w-full" size="lg" disabled={loading}>
          {loading ? t("common.loading") : t("auth.signIn")}
        </Button>
      </form>
      <div className="mt-6 flex flex-col gap-2 text-sm">
        <Link href="/forgot-password" className="text-primary">
          {t("auth.forgot")}
        </Link>
        <p className="text-muted">
          {t("auth.noAccount")}{" "}
          <Link href="/activate" className="font-medium text-primary">
            {t("auth.activateLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
