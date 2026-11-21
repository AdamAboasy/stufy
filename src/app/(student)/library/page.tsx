"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/feedback";
import { useI18n } from "@/lib/i18n";
import { api, ApiRequestError } from "@/lib/api";
import { formatBytes, formatDateTime } from "@/lib/utils";
import type { ExtractionResult, UploadedFile } from "@/types";

export default function LibraryPage() {
  const { t, lang } = useI18n();
  const { data, error, mutate } = useSWR<{ items: UploadedFile[] }>("/files");
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(files: FileList | File[]) {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        await api("/files", { method: "POST", body: form });
      }
      toast.success(t("library.processing"));
      await mutate();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : t("common.error"));
    } finally {
      setUploading(false);
    }
  }

  async function retry(id: string) {
    await api(`/files/${id}?action=retry`, { method: "POST" });
    toast.success(t("library.retry"));
    mutate();
  }

  async function remove(id: string) {
    if (!confirm(t("library.deleteConfirm"))) return;
    await api(`/files/${id}`, { method: "DELETE" });
    mutate();
  }

  if (error) return <ErrorState message={error.message} onRetry={() => mutate()} />;
  if (!data) return <PageLoader />;

  return (
    <div>
      <PageHeader title={t("library.title")} subtitle={t("library.subtitle")} />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
        }}
        className={`mb-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center ${drag ? "border-primary bg-primary/5" : "border-border"}`}
      >
        <Upload className="mb-3 size-8 text-primary" />
        <p className="font-medium">{t("library.drop")}</p>
        <p className="mt-1 text-sm text-muted">{t("library.types")}</p>
        <Button className="mt-4" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? t("common.loading") : t("library.browse")}
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
          onChange={(e) => e.target.files && upload(e.target.files)}
        />
      </div>

      {data.items.length === 0 ? (
        <EmptyState title={t("library.noFiles")} />
      ) : (
        <div className="grid gap-4">
          {data.items.map((file) => (
            <FileRow key={file.id} file={file} onRetry={retry} onDelete={remove} lang={lang} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function FileRow({
  file,
  onRetry,
  onDelete,
  lang,
  t,
}: {
  file: UploadedFile;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  lang: "ar" | "en";
  t: (k: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const { data } = useSWR<{ extraction: ExtractionResult | null }>(open ? `/files/${file.id}` : null);

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">{file.originalName}</p>
          <p className="text-xs text-muted">
            {formatBytes(file.fileSize, lang)} · {file.fileType.toUpperCase()} · {formatDateTime(file.createdAt, lang)}
            {file.totalPages ? ` · ${file.totalPages} ${t("common.pages")}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusTone(file.processingStatus)}>{t(`status.${file.processingStatus}`)}</Badge>
          <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
            {t("common.view")}
          </Button>
          {file.processingStatus === "failed" ? (
            <Button size="sm" variant="outline" onClick={() => onRetry(file.id)}>
              {t("common.retry")}
            </Button>
          ) : null}
          <Button size="sm" variant="danger" onClick={() => onDelete(file.id)}>
            {t("common.delete")}
          </Button>
        </div>
      </div>
      {open ? (
        <div className="mt-4 border-t border-border pt-4 text-sm">
          {file.processingStatus === "failed" ? (
            <p className="text-danger">{t("library.notRead")}</p>
          ) : null}
          {data?.extraction ? (
            <div className="space-y-2">
              <p>
                {data.extraction.chapters.length} {t("library.chapters")} · {data.extraction.totalPages} {t("common.pages")}
              </p>
              {data.extraction.uncertainty.length ? (
                <div>
                  <p className="font-medium">{t("library.uncertainty")}</p>
                  <ul className="list-disc ps-5 text-muted">
                    {data.extraction.uncertainty.map((u) => (
                      <li key={u}>{u}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <ul className="space-y-1">
                {data.extraction.chapters.map((ch) => (
                  <li key={ch.id}>
                    {ch.title} · pp. {ch.startPage}–{ch.endPage}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-muted">{t("common.loading")}</p>
          )}
        </div>
      ) : null}
    </Card>
  );
}
