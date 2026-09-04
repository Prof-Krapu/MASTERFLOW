import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Layers3,
  MapPin,
  RefreshCw,
  UserRound,
  X,
} from 'lucide-react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {CSSProperties, ReactElement} from 'react';

import type {MasterPlanPlanningEvent, MasterPlanPlanningView} from '@masterflow/shared';

import {getMasterPlanPlanning} from './api.ts';
import {
  addDays,
  dateKey,
  formatWeek,
  fromDateKey,
  groupMonths,
  isoWeekInfo,
  mondayOf,
} from './masterplan-calendar.ts';
import './masterplan-planning.css';

type PlanningLoadState = 'loading' | 'ready' | 'error';
type ColorMode = 'level' | 'subject';

type Props = {token: string};
type WeekLoad = {events: number; hours: number};
const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const START_HOUR = 8;
const END_HOUR = 20;
const HOUR_HEIGHT = 60;
const FULL_WEEK_HOURS = 25;

function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {weekday: 'long', day: 'numeric', month: 'long'}).format(date);
}

function minutes(value: string): number {
  const [hours = '0', mins = '0'] = value.split(':');
  return Number(hours) * 60 + Number(mins);
}

function eventHours(event: MasterPlanPlanningEvent): number {
  return Math.max(0, minutes(event.end) - minutes(event.start)) / 60;
}

function eventTimestamp(event: MasterPlanPlanningEvent): number {
  return fromDateKey(event.date).getTime() + minutes(event.start) * 60_000;
}

function statusLabel(status: string | null): string | null {
  const normalized = status?.toLocaleLowerCase('fr') ?? '';
  if (normalized.includes('cancel') || normalized.includes('annul')) return 'Annulé';
  if (normalized.includes('tentative') || normalized.includes('a_confirmer') || normalized.includes('provisoire')) return 'À confirmer';
  return null;
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
}

function subjectKey(event: MasterPlanPlanningEvent): string {
  const value = normalize(`${event.domain ?? ''} ${event.module}`);
  if (/pao|photoshop|illustrator|indesign|production/.test(value)) return 'pao';
  if (/motion|video|mapping|after.?effects/.test(value)) return 'motion';
  if (/\bia\b|intelligence artificielle|prompt/.test(value)) return 'ia';
  if (/crea|concept|talent|book|design/.test(value)) return 'crea';
  if (/jpo|porte ouverte/.test(value)) return 'jpo';
  if (/admin|reunion|jury/.test(value)) return 'admin';
  if (event.calendar_id === 'perso') return 'personal';
  return 'other';
}

function levelKey(event: MasterPlanPlanningEvent): string {
  const value = normalize(event.level_scope ?? event.level ?? event.level_label ?? '');
  const match = value.match(/[1-5]/)?.[0];
  if (match) return match;
  if (value.includes('multi')) return 'multi';
  if (event.calendar_id === 'perso') return 'personal';
  return 'unresolved';
}

function levelLabel(event: MasterPlanPlanningEvent): string {
  return event.level_label ?? event.level ?? event.level_scope ?? 'À préciser';
}

function weekKey(date: Date): string {
  return dateKey(mondayOf(date));
}

function eventStyle(event: MasterPlanPlanningEvent): CSSProperties {
  const start = Math.max(START_HOUR * 60, minutes(event.start));
  const end = Math.min(END_HOUR * 60, minutes(event.end));
  return {
    '--event-top': `${Math.max(0, ((start - START_HOUR * 60) / 60) * HOUR_HEIGHT)}px`,
    '--event-height': `${Math.max(52, ((Math.max(start + 45, end) - start) / 60) * HOUR_HEIGHT - 4)}px`,
  } as CSSProperties;
}

function calendarMark(calendarId: string, label: string): ReactElement {
  if (calendarId === 'perso') return <UserRound aria-hidden="true" size={24} strokeWidth={2.2} />;
  if (['iscom', 'brassart', 'ynov'].includes(calendarId)) {
    return <img alt="" aria-hidden="true" className="mp-school-logo" src={`/masterplan-logos/${calendarId}.svg`} />;
  }
  return <span className="mp-school-mark">{label.slice(0, 2).toLocaleUpperCase('fr')}</span>;
}

export function MasterPlanPlanning({token}: Props): ReactElement {
  const [state, setState] = useState<PlanningLoadState>('loading');
  const [data, setData] = useState<MasterPlanPlanningView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [activeCalendar, setActiveCalendar] = useState('all');
  const [colorMode, setColorMode] = useState<ColorMode>('level');
  const [selectedEvent, setSelectedEvent] = useState<MasterPlanPlanningEvent | null>(null);
  const [showNextToast, setShowNextToast] = useState(false);
  const eventDialogRef = useRef<HTMLElement>(null);
  const eventTriggerRef = useRef<HTMLButtonElement | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setState('loading');
    setError(null);
    try {
      const planning = await getMasterPlanPlanning(token);
      setData(planning);
      const todayWeek = weekKey(new Date());
      if (!planning.events.some((event) => weekKey(fromDateKey(event.date)) === todayWeek)) {
        const next = planning.events.find((event) => eventTimestamp(event) >= Date.now()) ?? planning.events[0];
        if (next) setWeekStart(mondayOf(fromDateKey(next.date)));
      }
      setState('ready');
    } catch (loadError) {
      setState('error');
      setError(loadError instanceof Error ? loadError.message : 'Planning indisponible.');
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const filteredEvents = useMemo(() => (data?.events ?? []).filter(
    (event) => activeCalendar === 'all' || event.calendar_id === activeCalendar,
  ), [activeCalendar, data?.events]);
  const days = useMemo(() => Array.from({length: 6}, (_, index) => addDays(weekStart, index)), [weekStart]);
  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, MasterPlanPlanningEvent[]>();
    for (const event of filteredEvents) grouped.set(event.date, [...(grouped.get(event.date) ?? []), event]);
    return grouped;
  }, [filteredEvents]);
  const weeklyLoads = useMemo(() => {
    const grouped = new Map<string, WeekLoad>();
    for (const event of filteredEvents) {
      const key = weekKey(fromDateKey(event.date));
      const current = grouped.get(key) ?? {events: 0, hours: 0};
      current.events += 1;
      current.hours += eventHours(event);
      grouped.set(key, current);
    }
    return grouped;
  }, [filteredEvents]);
  const weekOptions = useMemo(() => {
    if (!data || data.events.length === 0) return [];
    const starts = data.events.map((event) => mondayOf(fromDateKey(event.date)).getTime());
    const first = new Date(Math.min(...starts));
    const last = new Date(Math.max(...starts));
    const options: Date[] = [];
    for (let cursor = first; cursor.getTime() <= last.getTime(); cursor = addDays(cursor, 7)) options.push(cursor);
    return options;
  }, [data]);
  const monthGroups = useMemo(() => groupMonths(weekOptions), [weekOptions]);
  const nextEvent = useMemo(() => filteredEvents.find((event) => eventTimestamp(event) >= Date.now()) ?? null, [filteredEvents]);
  const nextEventKey = nextEvent ? `${nextEvent.calendar_id}-${nextEvent.id}` : null;
  const currentLoad = weeklyLoads.get(dateKey(weekStart)) ?? {events: 0, hours: 0};
  const currentIsoWeek = isoWeekInfo(weekStart);
  const moduleSessions = useMemo(() => selectedEvent
    ? (data?.events ?? []).filter((event) => event.module === selectedEvent.module)
    : [], [data?.events, selectedEvent]);
  const hourLabels = Array.from({length: END_HOUR - START_HOUR + 1}, (_, index) => START_HOUR + index);

  useEffect(() => {
    if (!nextEventKey) {
      setShowNextToast(false);
      return undefined;
    }
    setShowNextToast(true);
    const timeout = window.setTimeout(() => setShowNextToast(false), 7_600);
    return () => window.clearTimeout(timeout);
  }, [nextEventKey]);

  useEffect(() => {
    if (!selectedEvent) return undefined;
    const dialog = eventDialogRef.current;
    if (!dialog) return undefined;
    const focusableSelector = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
    const focusables = (): HTMLElement[] => Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
    const focusTimer = window.requestAnimationFrame(() => (focusables()[0] ?? dialog).focus());
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSelectedEvent(null);
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = focusables();
      if (elements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = elements[0]!;
      const last = elements[elements.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      if (eventTriggerRef.current?.isConnected) eventTriggerRef.current.focus();
    };
  }, [selectedEvent]);

  if (state === 'error' && !data) {
    return (
      <article className="mp-state mp-state--error" role="alert">
        <CalendarDays aria-hidden="true" size={28} />
        <div><strong>Planning indisponible</strong><span>{error === 'masterplan_source_unconfigured' ? 'La source locale doit encore être configurée.' : 'Réessaie dans un instant.'}</span></div>
        <button onClick={() => void load()} type="button">Réessayer</button>
      </article>
    );
  }

  return (
    <div className="mp-cockpit" data-color-mode={colorMode}>
      <h1 className="mp-sr-only">Planning MasterFlow</h1>

      <nav aria-label="Filtrer le planning" className="mp-school-rail">
        <button aria-label="Tous les calendriers" aria-pressed={activeCalendar === 'all'} className="mp-school-button mp-school-button--all" onClick={() => setActiveCalendar('all')} title="Tout afficher" type="button">ALL</button>
        {data?.calendars.map((calendar) => (
          <button
            aria-label={calendar.id === 'perso' ? 'Calendrier personnel' : calendar.label}
            aria-pressed={activeCalendar === calendar.id}
            className="mp-school-button"
            data-calendar={calendar.id}
            key={calendar.id}
            onClick={() => setActiveCalendar(calendar.id)}
            title={`${calendar.label} · ${calendar.event_count} rendez-vous`}
            type="button"
          >
            {calendarMark(calendar.id, calendar.label)}
            <span className="mp-sr-only">{calendar.label}</span>
          </button>
        ))}
      </nav>

      <div className="mp-stage">
        <header className="mp-topbar">
          <strong className="mp-wordmark">MasterPlan</strong>
          <div className="mp-topbar-actions">
            <span className="mp-current-load" title="Charge de la semaine sélectionnée">S{String(currentIsoWeek.week).padStart(2, '0')} · {currentLoad.hours.toFixed(1)} h</span>
            <div aria-label="Coloration des cours" className="mp-color-switch" role="group">
              <button aria-label="Colorer par niveau" aria-pressed={colorMode === 'level'} onClick={() => setColorMode('level')} title="Par niveau" type="button">N</button>
              <button aria-label="Colorer par matière" aria-pressed={colorMode === 'subject'} onClick={() => setColorMode('subject')} title="Par matière" type="button">M</button>
            </div>
            <button className="mp-icon-button mp-today-button" onClick={() => setWeekStart(mondayOf(new Date()))} type="button">Aujourd’hui</button>
            <button aria-label="Actualiser le planning" className="mp-icon-button" disabled={state === 'loading'} onClick={() => void load()} type="button"><RefreshCw aria-hidden="true" className={state === 'loading' ? 'is-spinning' : undefined} size={18} /></button>
          </div>
        </header>

        <section aria-busy={state === 'loading'} className="mp-planner-frame">
          <div aria-label="Semaines de l’année" className="mp-week-navigator" role="region">
            <button aria-label="Semaine précédente" className="mp-week-arrow" onClick={() => setWeekStart((current) => addDays(current, -7))} type="button"><ChevronLeft aria-hidden="true" size={25} /></button>
            <div className="mp-year-overview">
              <div className="mp-year-track">
                <div aria-hidden="true" className="mp-month-overview">
                  {monthGroups.map((group) => <span key={group.key} style={{'--month-weeks': group.weeks} as CSSProperties}>{group.label}</span>)}
                </div>
                <div className="mp-week-overview">
                  {weekOptions.map((option) => {
                    const key = dateKey(option);
                    const load = weeklyLoads.get(key) ?? {events: 0, hours: 0};
                    const ratio = Math.min(100, Math.round((load.hours / FULL_WEEK_HOURS) * 100));
                    const iso = isoWeekInfo(option);
                    const isCurrent = key === weekKey(new Date());
                    return (
                      <button
                        aria-label={`Semaine ISO ${iso.week} de ${iso.year}, ${load.hours.toFixed(1)} heures`}
                        aria-pressed={key === dateKey(weekStart)}
                        className={`${load.hours > 0 ? 'has-events' : ''} ${load.hours >= 20 ? 'load-high' : load.hours >= 10 ? 'load-mid' : ''} ${isCurrent ? 'is-current' : ''}`.trim()}
                        key={key}
                        onClick={() => setWeekStart(option)}
                        style={{'--week-load': `${ratio}%`} as CSSProperties}
                        title={`S${String(iso.week).padStart(2, '0')} · ${formatWeek(option)} · ${load.hours.toFixed(1)} h`}
                        type="button"
                      ><span>S{String(iso.week).padStart(2, '0')}</span></button>
                    );
                  })}
                </div>
              </div>
            </div>
            <button aria-label="Semaine suivante" className="mp-week-arrow" onClick={() => setWeekStart((current) => addDays(current, 7))} type="button"><ChevronRight aria-hidden="true" size={25} /></button>
          </div>

          <div className="mp-week-caption">
            <strong>S{String(currentIsoWeek.week).padStart(2, '0')} · {formatWeek(weekStart)}</strong>
            <span>{currentLoad.events} rendez-vous</span>
          </div>

          {state === 'loading' && !data ? (
            <div className="mp-state" role="status"><RefreshCw aria-hidden="true" className="is-spinning" size={24} /><span>Chargement…</span></div>
          ) : currentLoad.events === 0 ? (
            <div className="mp-state" role="status"><CalendarDays aria-hidden="true" size={26} /><div><strong>Semaine libre</strong><span>Aucun rendez-vous dans ce filtre.</span></div></div>
          ) : (
            <div className="mp-schedule-viewport" aria-label={`Planning de la semaine ISO ${currentIsoWeek.week}`} role="region" tabIndex={0}>
              <div className="mp-schedule-grid">
                <div className="mp-time-corner">Heures</div>
                <div className="mp-days-head">
                  {days.map((day, dayIndex) => {
                    const key = dateKey(day);
                    return <div className={key === dateKey(new Date()) ? 'is-today' : ''} key={key}><span>{DAY_LABELS[dayIndex]}</span><strong>{String(day.getDate()).padStart(2, '0')}</strong></div>;
                  })}
                </div>
                <div className="mp-time-axis">
                  {hourLabels.map((hour) => <span key={hour} style={{top: `${(hour - START_HOUR) * HOUR_HEIGHT}px`}}>{String(hour).padStart(2, '0')}:00</span>)}
                </div>
                <div className="mp-days-grid" style={{'--schedule-height': `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px`} as CSSProperties}>
                  {days.map((day) => {
                    const key = dateKey(day);
                    const events = eventsByDay.get(key) ?? [];
                    return (
                      <section className={key === dateKey(new Date()) ? 'is-today' : ''} key={key}>
                        {events.map((event) => {
                          const visibleStatus = statusLabel(event.status);
                          return (
                            <button aria-haspopup="dialog" className="mp-event-card" data-calendar={event.calendar_id} data-level={levelKey(event)} data-subject={subjectKey(event)} key={`${event.calendar_id}-${event.id}`} onClick={(pointerEvent) => { eventTriggerRef.current = pointerEvent.currentTarget; setSelectedEvent(event); }} style={eventStyle(event)} type="button">
                              <span className="mp-event-time"><Clock3 aria-hidden="true" size={12} />{event.start}–{event.end}</span>
                              <strong>{event.module}</strong>
                              {event.class_label ? <span className="mp-event-class">{event.class_label}</span> : null}
                              {event.room ? <span className="mp-event-room"><MapPin aria-hidden="true" size={11} />{event.room}</span> : null}
                              {visibleStatus ? <span className="mp-event-status">{visibleStatus}</span> : null}
                            </button>
                          );
                        })}
                      </section>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {nextEvent && showNextToast ? (
        <aside aria-label="Prochain rendez-vous" aria-live="polite" className="mp-next-toast" role="status">
          <button aria-label="Fermer" onClick={() => setShowNextToast(false)} type="button"><X aria-hidden="true" size={14} /></button>
          <span>Prochain créneau</span>
          <strong>{formatLongDate(fromDateKey(nextEvent.date))} · {nextEvent.start}–{nextEvent.end}</strong>
          <b>{nextEvent.module}</b>
          <em>{nextEvent.class_label ?? nextEvent.room ?? 'Planning personnel'}</em>
        </aside>
      ) : null}

      {selectedEvent ? (
        <div className="mp-event-modal" role="presentation" onPointerDown={(event) => { if (event.currentTarget === event.target) setSelectedEvent(null); }}>
          <article aria-labelledby="mp-event-title" aria-modal="true" className="mp-event-dialog" data-level={levelKey(selectedEvent)} data-subject={subjectKey(selectedEvent)} ref={eventDialogRef} role="dialog" tabIndex={-1}>
            <button aria-label="Fermer" className="mp-dialog-close" onClick={() => setSelectedEvent(null)} type="button"><X aria-hidden="true" size={19} /></button>
            <span className="mp-dialog-kicker">S{String(isoWeekInfo(fromDateKey(selectedEvent.date)).week).padStart(2, '0')}</span>
            <h2 id="mp-event-title">{selectedEvent.module}</h2>
            <div className="mp-event-facts">
              <span><CalendarDays aria-hidden="true" size={16} />{formatLongDate(fromDateKey(selectedEvent.date))}</span>
              <span><Clock3 aria-hidden="true" size={16} />{selectedEvent.start}–{selectedEvent.end}</span>
              {selectedEvent.room ? <span><MapPin aria-hidden="true" size={16} />{selectedEvent.room}</span> : null}
              <span><Layers3 aria-hidden="true" size={16} />{levelLabel(selectedEvent)}</span>
            </div>
            {selectedEvent.domain ? <p className="mp-event-domain">{selectedEvent.domain}</p> : null}
            {selectedEvent.objective_refs.length > 0 ? <section><h3>Objectifs liés</h3><ul>{selectedEvent.objective_refs.map((objective) => <li key={objective}>{objective}</li>)}</ul></section> : null}
            {moduleSessions.length > 1 ? (
              <section>
                <h3>{moduleSessions.length} séances</h3>
                <div className="mp-session-list">{moduleSessions.map((session, index) => (
                  <button aria-current={session.id === selectedEvent.id ? 'true' : undefined} key={`${session.calendar_id}-${session.id}`} onClick={() => { setSelectedEvent(session); setWeekStart(mondayOf(fromDateKey(session.date))); }} type="button"><span>{String(index + 1).padStart(2, '0')}</span><strong>{new Intl.DateTimeFormat('fr-FR', {day: '2-digit', month: '2-digit'}).format(fromDateKey(session.date))}</strong><small>{session.start}</small></button>
                ))}</div>
              </section>
            ) : null}
          </article>
        </div>
      ) : null}
    </div>
  );
}
