"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { api, ApiRequestError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ phoneNumber }),
      });
      setDone(true);
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : t("common.error"));
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight">{t("auth.forgotTitle")}</h1>
      <p className="mt-2 text-sm text-muted">{t("auth.forgotHint")}</p>
      {done ? (
        <p className="mt-8 rounded-2xl bg-success/10 p-4 text-sm text-success">
          {t("auth.requestSent")}
        </p>
      ) : (
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
          <Button className="w-full" size="lg">
            {t("auth.sendRequest")}
          </Button>
        </form>
      )}
      <Link href="/login" className="mt-6 inline-block text-sm text-primary">
        {t("common.back")}
      </Link>
    </div>
  );
}
