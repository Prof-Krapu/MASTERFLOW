(() => {
  'use strict';

  const STORAGE_KEY = 'masterplan-vincent-sources-v1';
  const DEFAULT_SOURCE = Object.freeze({
    id: 'calendar-lycee-des-flandres',
    name: 'Lycée des Flandres',
    color: '#dd0725'
  });
  const ACADEMIC_START = new Date(2026, 7, 31);
  const ACADEMIC_END = new Date(2027, 6, 31, 23, 59, 59);
  const DAY_NAMES = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];

  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const isoDate = date => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');

  const formatTime = date => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  function readSources() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_error) {
      return [];
    }
  }

  function writeSources(sources) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
  }

  async function fetchCalendarUrl(url) {
    try {
      const direct = await fetch(url, {cache: 'no-store'});
      if (direct.ok) return direct.text();
    } catch (_error) {}

    const proxy = await fetch(`/api/calendar?url=${encodeURIComponent(url)}`, {cache: 'no-store'});
    if (!proxy.ok) throw new Error(`Le lien Pronote répond avec le statut ${proxy.status}.`);
    return proxy.text();
  }

  function unfoldIcs(text) {
    return String(text || '').replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').replace(/\r/g, '');
  }

  function unescapeIcs(value) {
    return String(value || '')
      .replace(/\\n/gi, ' ')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\')
      .trim();
  }

  function parseIcsDate(value) {
    const clean = String(value || '').trim();
    const match = clean.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?(Z)?$/);
    if (!match) return null;
    const [, year, month, day, hour = '00', minute = '00', second = '00', utc] = match;
    const parts = [Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)];
    return utc ? new Date(Date.UTC(...parts)) : new Date(...parts);
  }

  function parseIcs(text, source) {
    const unfolded = unfoldIcs(text);
    if (!/BEGIN:VCALENDAR/i.test(unfolded)) throw new Error('Ce fichier ne contient pas de calendrier iCal valide.');
    const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
    return blocks.map((block, index) => {
      const fields = {};
      block.split('\n').forEach(line => {
        const separator = line.indexOf(':');
        if (separator < 0) return;
        const key = line.slice(0, separator).split(';')[0].toUpperCase();
        if (!(key in fields)) fields[key] = line.slice(separator + 1);
      });
      const start = parseIcsDate(fields.DTSTART);
      const end = parseIcsDate(fields.DTEND) || (start ? new Date(start.getTime() + 60 * 60 * 1000) : null);
      if (!start || !end || end <= start) return null;
      return {
        id: fields.UID || `${source.id}-${index}-${start.getTime()}`,
        sourceId: source.id,
        sourceName: source.name,
        color: source.color,
        start,
        end,
        title: unescapeIcs(fields.SUMMARY) || 'Cours',
        room: unescapeIcs(fields.LOCATION) || 'Salle a verifier',
        description: unescapeIcs(fields.DESCRIPTION)
      };
    }).filter(Boolean);
  }

  function inferSubject(title) {
    const value = title.toLowerCase();
    if (/pao|photoshop|illustrator|indesign/.test(value)) return 'pao';
    if (/motion|video|mapping|after effects/.test(value)) return 'motion';
    if (/\bia\b|intelligence artificielle|generative/.test(value)) return 'ia';
    if (/crea|design|processus|sprint|direction artistique/.test(value)) return 'crea';
    if (/jpo|portes ouvertes/.test(value)) return 'jpo';
    if (/admin|reunion|jury|conseil|rentree/.test(value)) return 'admin';
    return 'other';
  }

  function inferLevel(title) {
    const match = title.match(/(?:^|\s)(?:B|M|N)?([1-5])(?:\b|[A-Z])/i);
    return match ? match[1] : 'other';
  }

  function mondayOf(date) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = copy.getDay() || 7;
    copy.setDate(copy.getDate() - day + 1);
    return copy;
  }

  function isoWeek(date) {
    const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    copy.setUTCDate(copy.getUTCDate() + 4 - (copy.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
    return Math.ceil((((copy - yearStart) / 86400000) + 1) / 7);
  }

  function quarterFor(date) {
    const month = date.getMonth() + 1;
    if (month >= 9 && month <= 12) return 'q1';
    if (month >= 1 && month <= 3) return 'q2';
    return 'q3';
  }

  function buildWeeks() {
    const result = [];
    let cursor = mondayOf(ACADEMIC_START);
    while (cursor <= ACADEMIC_END) {
      result.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }
    return result;
  }

  function eventCard(event) {
    const startMinutes = Math.max(0, (event.start.getHours() - 8) * 60 + event.start.getMinutes());
    const endMinutes = Math.min(720, (event.end.getHours() - 8) * 60 + event.end.getMinutes());
    if (endMinutes <= 0 || startMinutes >= 720) return '';
    const duration = Math.max(45, endMinutes - startMinutes);
    const level = inferLevel(event.title);
    const subject = inferSubject(event.title);
    const title = escapeHtml(event.title);
    const room = escapeHtml(event.room);
    const source = escapeHtml(event.sourceName);
    const color = escapeHtml(event.color || '#3979e8');
    return `<article class="slot event-card level-${level} subject-${subject} school-profkrapu" tabindex="0" role="button" style="--event-top:${startMinutes};--event-height:${duration};--level-palette:${color};--subject-palette:${color}" data-date="${isoDate(event.start)}" data-month="${isoDate(event.start).slice(0, 7)}" data-quarter="${quarterFor(event.start)}" data-level="${level}" data-subject="${subject}" data-school="profkrapu" data-room="${room}" data-session-start="${formatTime(event.start)}" data-session-end="${formatTime(event.end)}" data-class-label="${source}" title="${formatTime(event.start)}-${formatTime(event.end)} · ${title} · ${source} · ${room}"><svg class="event-course-icon" aria-hidden="true"><use href="#course-icon-${subject}"></use></svg><div class="event-summary"><span class="event-time">${formatTime(event.start)}-${formatTime(event.end)}</span><strong>${title}</strong><span class="event-class">${source}</span><span class="event-room">${room}</span></div></article>`;
  }

  function renderPlanner(sources) {
    const root = document.querySelector('.planner-main');
    if (!root) return;
    const events = sources.flatMap(source => {
      try { return parseIcs(source.ics, source); }
      catch (_error) { return []; }
    }).filter(event => event.end >= ACADEMIC_START && event.start <= ACADEMIC_END);

    if (!sources.length) {
      root.innerHTML = `<section class="builder-empty"><span class="builder-empty-school" data-ldf-logo></span><strong>Connecter le planning Pronote</strong><span>Lycée des Flandres</span><button type="button" data-builder-open>Ajouter le lien Pronote</button></section><section class="planner-section hidden"><div class="screen-reader-only"><h2 id="agenda-title">MASTERPLAN</h2><p id="view-note">Aucune source importee.</p></div><div class="week-navigator"><button class="week-btn" type="button" data-week-action="prev">‹</button><select class="week-select"></select><div class="month-overview" id="month-overview"></div><div class="week-overview" id="week-overview"></div><button class="week-btn" type="button" data-week-action="next">›</button><span class="week-status" id="week-status"></span></div><div class="schedule-grid-view"></div></section>`;
      return;
    }

    const weeks = buildWeeks();
    const now = new Date();
    const nextEvent = events.filter(event => event.end >= now).sort((a, b) => a.start - b.start)[0] || null;
    const targetDate = nextEvent?.start || events.sort((a, b) => a.start - b.start)[0]?.start || ACADEMIC_START;
    const activeWeek = isoDate(mondayOf(targetDate));
    const options = [];
    const weekMarkup = weeks.map((weekStart, index) => {
      const days = Array.from({length: 6}, (_, offset) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + offset);
        return date;
      });
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekEvents = events.filter(event => event.start >= weekStart && event.start < weekEnd);
      const weekHours = weekEvents.reduce((sum, event) => sum + ((event.end - event.start) / 3600000), 0);
      const number = String(isoWeek(weekStart)).padStart(2, '0');
      const label = `S${number} · ${String(weekStart.getDate()).padStart(2, '0')}/${String(weekStart.getMonth() + 1).padStart(2, '0')} → ${String(days[5].getDate()).padStart(2, '0')}/${String(days[5].getMonth() + 1).padStart(2, '0')}`;
      options.push(`<option value="${index}">${label}</option>`);
      const heads = days.map(date => {
        const hasEvents = weekEvents.some(event => isoDate(event.start) === isoDate(date));
        return `<div class="grid-day-head${hasEvents ? '' : ' is-empty'}" data-day-date="${isoDate(date)}"><strong>${DAY_NAMES[date.getDay()]} ${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}</strong><span>${MONTHS[date.getMonth()]} ${date.getFullYear()}</span></div>`;
      }).join('');
      const columns = days.map(date => {
        const cards = weekEvents.filter(event => isoDate(event.start) === isoDate(date)).map(eventCard).join('');
        return `<div class="grid-day-col${cards ? '' : ' is-empty'}" data-day-date="${isoDate(date)}">${cards}</div>`;
      }).join('');
      const hours = Array.from({length: 13}, (_, hour) => `<div class="hour-label${hour === 12 ? ' hour-label-end' : ''}">${String(hour + 8).padStart(2, '0')}h00</div>`).join('');
      return `<div class="schedule-week${isoDate(weekStart) === activeWeek ? '' : ' hidden'}" data-week-index="${index}" data-week-start="${isoDate(weekStart)}" data-months="${[...new Set(days.map(day => isoDate(day).slice(0, 7)))].join(' ')}" data-quarters="${quarterFor(days[3])}" data-has-alerts="0" data-has-events="${weekEvents.length ? 1 : 0}" data-has-holiday="0" data-page-label="S${number}" data-label="${label}" data-event-count="${weekEvents.length}" data-week-hours="${weekHours.toFixed(2)}"><div class="week-label">${label}</div><div class="schedule-grid-shell" data-week-index="${index}"><div class="corner-cell">Heures</div><div class="grid-days-head" style="--day-count:6">${heads}</div><div class="time-axis">${hours}</div><div class="grid-days-body" style="--day-count:6">${columns}</div></div></div>`;
    }).join('');

    root.innerHTML = `<section class="planner-section"><div class="screen-reader-only"><h2 id="agenda-title">MASTERPLAN</h2><p id="view-note">Planning importe.</p></div><div class="week-navigator" data-active-week="${activeWeek}"><button class="week-btn week-arrow" type="button" data-week-action="prev" aria-label="Semaine precedente">‹</button><select class="week-select" aria-label="Choisir une semaine">${options.join('')}</select><div class="month-overview" id="month-overview"></div><div class="week-overview" id="week-overview"></div><button class="week-btn week-arrow" type="button" data-week-action="next" aria-label="Semaine suivante">›</button><button class="week-btn week-btn-ghost hidden" type="button" data-week-action="current">Prochain cours</button><span class="week-status" id="week-status"></span></div><div class="schedule-grid-view" data-grid-view="year" data-active-week="${activeWeek}">${weekMarkup}</div></section>`;

    const alert = document.getElementById('next-alert');
    if (alert && nextEvent) {
      alert.classList.remove('is-hidden');
      alert.querySelector('strong').textContent = nextEvent.title;
      alert.querySelector('b').textContent = `${formatTime(nextEvent.start)} · ${nextEvent.room}`;
    }
  }

  function injectBuilderUi(sources) {
    const style = document.createElement('style');
    style.textContent = `
      .builder-modal{position:fixed;inset:0;z-index:940;display:none;place-items:center;padding:18px;background:#000;color:#f8fafc}.builder-modal.open{display:grid}.builder-card{width:min(520px,100%);max-height:calc(100dvh - 36px);overflow:auto;border:1px solid #29292e;border-radius:24px;background:#0d0d0f;padding:24px;box-sizing:border-box;box-shadow:0 28px 90px #000}.builder-lockup{display:flex;align-items:center;gap:16px;margin-bottom:22px}.builder-school-logo{width:72px;height:72px;display:grid;place-items:center;color:#f8fafc}.builder-school-logo svg{width:100%;height:100%}.builder-brand{width:150px;filter:invert(1)}.builder-card h2{margin:0 0 8px;font-size:28px}.builder-card>p{margin:0 0 22px;color:#9aa4b2}.builder-form{display:grid;gap:14px}.builder-form label{display:grid;gap:6px;color:#9aa4b2;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.builder-form input{width:100%;box-sizing:border-box;border:1px solid #303039;border-radius:12px;background:#171719;color:#fff;padding:12px;font:inherit}.builder-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:8px}.builder-actions button,.builder-empty button,.builder-manage{border:0;border-radius:999px;padding:11px 16px;background:#dd0725;color:#fff;font-weight:900;cursor:pointer}.builder-actions .secondary{background:#242427;color:#d8dee9}.builder-status{min-height:18px;color:#d99a2b;font-size:12px}.builder-sources{display:grid;gap:8px;margin:18px 0}.builder-source{display:grid;grid-template-columns:12px minmax(0,1fr) auto;align-items:center;gap:10px;border:1px solid #29292e;border-radius:12px;padding:10px;background:#171719}.builder-source i{width:10px;height:10px;border-radius:50%;background:var(--source-color)}.builder-source small{display:block;color:#8f9aaa}.builder-source button{border:0;background:transparent;color:#d84c5c;cursor:pointer}.builder-empty{min-height:calc(100dvh - 126px);display:grid;place-items:center;align-content:center;gap:14px;text-align:center}.builder-empty-school{width:112px;height:112px;display:grid;place-items:center;color:#f8fafc}.builder-empty strong{font-size:24px}.builder-empty span{color:#8f9aaa}.builder-manage{width:100%;margin-top:8px;background:#242427}.school-logo-btn .ldf-logo-host{width:34px;height:34px}.ldf-logo-host{display:grid;place-items:center;color:currentColor}.ldf-logo-host svg{width:100%;height:100%;display:block}.ldf-logo-svg .ldf-adaptive{fill:currentColor!important}.ldf-logo-svg .ldf-red{fill:#dd0725!important}.add-calendar-form{display:none!important}.next-alert.is-hidden{display:none!important}@media(max-width:680px){.builder-card{padding:20px;border-radius:20px}.builder-card h2{font-size:24px}.school-logo-btn .ldf-logo-host{width:30px;height:30px}}
    `;
    document.head.appendChild(style);

    const modal = document.createElement('div');
    modal.className = 'builder-modal';
    modal.id = 'builder-modal';
    modal.innerHTML = `<article class="builder-card" role="dialog" aria-modal="true" aria-labelledby="builder-title"><div class="builder-lockup"><span class="builder-school-logo ldf-logo-host" data-ldf-logo></span><img class="builder-brand" src="assets/masterflow-wordmark.svg" alt="MasterFlow"></div><h2 id="builder-title">Connecter Pronote</h2><p>Colle le lien de mise à jour du planning du Lycée des Flandres. MASTERPLAN s'ouvrira dès que le flux sera reconnu.</p><div class="builder-sources" id="builder-sources"></div><form class="builder-form" id="builder-form"><label>Lien de mise à jour Pronote<input id="builder-url" type="url" inputmode="url" autocomplete="url" placeholder="https://.../planning.ics" required></label><div class="builder-status" id="builder-status"></div><div class="builder-actions"><button class="secondary" id="builder-close" type="button">Fermer</button><button type="submit">Ouvrir le planning</button></div></form></article>`;
    document.body.appendChild(modal);

    const open = () => {
      renderSourceList(readSources());
      const current = readSources()[0];
      document.getElementById('builder-url').value = current?.url || '';
      modal.classList.add('open');
    };
    const close = () => {
      if (readSources().length) modal.classList.remove('open');
    };
    window.MasterPlanVincentBuilder = {open};
    document.addEventListener('click', event => {
      if (event.target.closest('[data-builder-open]')) open();
    });
    document.getElementById('builder-close').addEventListener('click', close);
    document.getElementById('builder-form').addEventListener('submit', importFromBuilder);

    const desktopManage = document.createElement('button');
    desktopManage.className = 'rail-mode';
    desktopManage.type = 'button';
    desktopManage.title = 'Lien Pronote';
    desktopManage.setAttribute('aria-label', 'Modifier le lien Pronote');
    desktopManage.textContent = '+';
    desktopManage.addEventListener('click', open);
    document.querySelector('.rail-modes')?.appendChild(desktopManage);

    const mobileManage = document.createElement('button');
    mobileManage.className = 'builder-manage';
    mobileManage.type = 'button';
    mobileManage.textContent = 'Modifier le lien Pronote';
    mobileManage.addEventListener('click', open);
    document.querySelector('.mobile-settings-options')?.appendChild(mobileManage);

    const addButton = document.getElementById('add-calendar-btn');
    addButton?.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      open();
    }, true);
    document.getElementById('calendar-form')?.addEventListener('submit', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const url = document.getElementById('cal-url')?.value?.trim();
      if (!url) return;
      open();
      document.getElementById('builder-url').value = url;
    }, true);
    if (!sources.length) open();
  }

  function renderSourceList(sources) {
    const root = document.getElementById('builder-sources');
    if (!root) return;
    root.innerHTML = sources.map(source => `<div class="builder-source"><i style="--source-color:${escapeHtml(source.color)}"></i><span><b>${escapeHtml(source.name)}</b><small>${source.type === 'url' ? 'Lien synchronise' : 'Fichier local'} · ${source.eventCount || 0} evenement(s)</small></span><button type="button" data-remove-source="${escapeHtml(source.id)}" aria-label="Supprimer">×</button></div>`).join('');
    root.querySelectorAll('[data-remove-source]').forEach(button => button.addEventListener('click', () => {
      const next = readSources().filter(source => source.id !== button.dataset.removeSource);
      writeSources(next);
      location.reload();
    }));
  }

  async function importFromBuilder(event) {
    event.preventDefault();
    const status = document.getElementById('builder-status');
    const draft = {...DEFAULT_SOURCE, type: 'url', updatedAt: new Date().toISOString()};
    try {
      status.textContent = 'Connexion à Pronote...';
      draft.url = document.getElementById('builder-url').value.trim();
      if (!draft.url) throw new Error('Ajoute le lien de mise à jour Pronote.');
      draft.ics = await fetchCalendarUrl(draft.url);
      const events = parseIcs(draft.ics, draft);
      if (!events.length) throw new Error('Aucun evenement exploitable dans cette source.');
      draft.eventCount = events.length;
      writeSources([draft]);
      status.textContent = `${events.length} evenement(s) importes. Ouverture du planning...`;
      location.reload();
    } catch (error) {
      status.textContent = error.message || "Le lien Pronote n'a pas pu être lu.";
    }
  }

  async function refreshUrlSources() {
    const sources = readSources();
    const urlSources = sources.filter(source => source.type === 'url' && source.url);
    if (!urlSources.length || sessionStorage.getItem('masterplan-vincent-refreshed')) return;
    sessionStorage.setItem('masterplan-vincent-refreshed', '1');
    let changed = false;
    await Promise.all(urlSources.map(async source => {
      try {
        const ics = await fetchCalendarUrl(source.url);
        if (ics !== source.ics && /BEGIN:VCALENDAR/i.test(ics)) {
          source.ics = ics;
          source.updatedAt = new Date().toISOString();
          source.eventCount = parseIcs(ics, source).length;
          changed = true;
        }
      } catch (_error) {}
    }));
    if (changed) {
      writeSources(sources);
      location.reload();
    }
  }

  async function hydrateLdfLogos() {
    const hosts = [...document.querySelectorAll('[data-ldf-logo]')];
    if (!hosts.length) return;
    try {
      const response = await fetch('assets/lycee-des-flandres.svg');
      const markup = await response.text();
      hosts.forEach(host => {
        host.classList.add('ldf-logo-host');
        host.innerHTML = markup;
      });
    } catch (_error) {
      hosts.forEach(host => { host.textContent = 'LDF'; });
    }
  }

  globalThis.MasterPlanVincentCore = {parseIcs, parseIcsDate, inferLevel, inferSubject, mondayOf, isoWeek};
  if (typeof document === 'undefined') return;

  const sources = readSources();
  renderPlanner(sources);
  injectBuilderUi(sources);
  hydrateLdfLogos();
  window.addEventListener('load', refreshUrlSources, {once: true});
})();
