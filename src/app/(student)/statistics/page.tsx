"use client";

import useSWR from "swr";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/feedback";
import { useI18n } from "@/lib/i18n";
import { formatMinutes } from "@/lib/utils";

export default function StatisticsPage() {
  const { t, lang } = useI18n();
  const { data } = useSWR<{
    overall: {
      totalStudyMinutes: number;
      totalPagesStudied: number;
      remainingTasks: number;
      overallProgress: number;
      completedTasks: number;
      totalTasks: number;
    };
    daily: Array<{ date: string; actualMinutes: number; completedTasks: number; completionPercent: number }>;
    bySubject: Array<{ subject: string; percent: number; completed: number; total: number }>;
    week: { studyMinutes: number; completedTasks: number };
  }>("/stats");

  if (!data) return <PageLoader />;

  return (
    <div>
      <PageHeader title={t("stats.title")} subtitle={t("stats.note")} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs text-muted">{t("stats.hours")}</p>
          <p className="mt-2 text-2xl font-semibold">{formatMinutes(data.overall.totalStudyMinutes, lang)}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">{t("stats.pages")}</p>
          <p className="mt-2 text-2xl font-semibold">{data.overall.totalPagesStudied}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">{t("stats.overall")}</p>
          <p className="mt-2 text-2xl font-semibold">{data.overall.overallProgress}%</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">{t("common.week")}</p>
          <p className="mt-2 text-2xl font-semibold">{formatMinutes(data.week.studyMinutes, lang)}</p>
        </Card>
      </div>
      <Card className="mt-6 h-72">
        <h3 className="mb-4 font-semibold">{t("common.week")}</h3>
        <ResponsiveContainer width="100%" height="80%">
          <BarChart data={data.daily}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="actualMinutes" fill="#5268E8" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card className="mt-6">
        <h3 className="mb-4 font-semibold">{t("stats.bySubject")}</h3>
        <ul className="space-y-3">
          {data.bySubject.map((s) => (
            <li key={s.subject}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{s.subject}</span>
                <span className="text-muted">
                  {s.completed}/{s.total}
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-secondary" style={{ width: `${s.percent}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
