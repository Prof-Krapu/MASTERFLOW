export type IsoWeek = {week: number; year: number};
export type MonthGroup = {key: string; label: string; weeks: number};

export function dateKey(date: Date): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export function fromDateKey(value: string): Date {
  const [year = 0, month = 1, day = 1] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function mondayOf(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = result.getDay() || 7;
  result.setDate(result.getDate() - day + 1);
  return result;
}

export function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

/** Numérotation ISO 8601 : lundi, semaine 1 = semaine contenant le premier jeudi. */
export function isoWeekInfo(date: Date): IsoWeek {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const year = target.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil((((target.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return {week, year};
}

export function formatWeek(start: Date): string {
  const formatter = new Intl.DateTimeFormat('fr-FR', {day: 'numeric', month: 'short'});
  return `${formatter.format(start)} — ${formatter.format(addDays(start, 5))}`;
}

function monthLabel(weekStart: Date): string {
  const anchor = addDays(weekStart, 3);
  const month = new Intl.DateTimeFormat('fr-FR', {month: 'short'}).format(anchor).replace('.', '');
  return `${month} ${String(anchor.getFullYear()).slice(-2)}`.toLocaleUpperCase('fr');
}

export function groupMonths(weeks: Date[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const week of weeks) {
    const anchor = addDays(week, 3);
    const key = `${anchor.getFullYear()}-${anchor.getMonth()}`;
    const current = groups.at(-1);
    if (current?.key === key) current.weeks += 1;
    else groups.push({key, label: monthLabel(week), weeks: 1});
  }
  return groups;
}
