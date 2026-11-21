"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { api, ApiRequestError } from "@/lib/api";

export default function RegisterPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({ fullName, phoneNumber, password }),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      const err = error as ApiRequestError;
      if (err.code === "NO_CODE") router.push("/activate");
      toast.error(err.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight">{t("auth.registerTitle")}</h1>
      <p className="mt-2 text-sm text-muted">{t("auth.registerHint")}</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="name">{t("auth.fullName")}</Label>
          <Input
            id="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-12 text-base"
            required
          />
        </div>
        <div>
          <Label htmlFor="phone">{t("auth.phone")}</Label>
          <Input
            id="phone"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="01xxxxxxxxx"
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
          <p className="mt-1 text-xs text-muted">{t("auth.passwordRule")}</p>
        </div>
        <Button className="w-full" size="lg" disabled={loading}>
          {loading ? t("common.loading") : t("auth.createAccount")}
        </Button>
      </form>
    </div>
  );
}
