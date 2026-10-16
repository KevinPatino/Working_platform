// src/utils/payroll.ts

// Configuración de nómina bisemanal
const ANCHOR_DATE = new Date(2026, 7, 31); // 31 de Agosto de 2026
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CYCLE_DAYS = 14;

export const getBaseCycleIndex = () => {
  const now = new Date();
  const todayAtMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((todayAtMidnight.getTime() - ANCHOR_DATE.getTime()) / MS_PER_DAY);
  return Math.floor(diffDays / CYCLE_DAYS);
};

export const getPeriodRangeByIndex = (cycleIndex: number) => {
  const currentStart = new Date(ANCHOR_DATE.getTime() + cycleIndex * CYCLE_DAYS * MS_PER_DAY);
  const currentEnd = new Date(ANCHOR_DATE.getTime() + (cycleIndex * CYCLE_DAYS + 13) * MS_PER_DAY);

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  return {
    start: formatDate(currentStart),
    end: formatDate(currentEnd),
  };
};

export const formatPeriodLegend = (startStr: string, endStr: string) => {
  if (!startStr || !endStr) return "";
  const s = new Date(startStr + "T00:00:00");
  const e = new Date(endStr + "T00:00:00");
  const sMonth = s.toLocaleDateString("en-US", { month: "short" });
  const eMonth = e.toLocaleDateString("en-US", { month: "short" });
  const sDay = s.getDate();
  const eDay = e.getDate();
  const year = e.getFullYear();

  if (sMonth === eMonth) {
    return `${sMonth} ${sDay} – ${eDay}, ${year}`;
  }
  return `${sMonth} ${sDay} – ${eMonth} ${eDay}, ${year}`;
};

export const getLocalTodayString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};