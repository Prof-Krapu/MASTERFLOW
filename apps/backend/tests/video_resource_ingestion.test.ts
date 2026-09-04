import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  detectNotions,
  ingestVideoResource,
  type IngestVideoResult,
} from '../src/services/video_resource_ingestion.ts';

const actor: AuthUser = {id: 'video-ingest-admin', username: 'video_ingest_admin', role: 'admin'};

function insertActor(id: string, username: string, role: string): void {
  const now = Date.now();
  getDb().prepare(`
    INSERT OR IGNORE INTO users (id, username, display_name, password_hash, role, active, created_at, updated_at)
    VALUES (?, ?, ?, 'x', ?, 1, ?, ?)
  `).run(id, username, username, role, now, now);
}

beforeAll(async () => {
  await seedAll();
  insertActor(actor.id, actor.username, actor.role);
});

describe('ingestion video de reference (local, mock)', () => {
  it('detecte des notions locales sans LLM ni appel reseau', () => {
    const notions = detectNotions('je fais un storyboard puis j exporte le rendu vers premiere');
    const labels = notions.map((n) => n.label.toLowerCase());
    expect(labels).toContain('storyboard');
    expect(labels).toContain('rendu');
    expect(labels).toContain('premiere');
    expect(notions.every((n) => n.type)).toBe(true);
  });

  it('ingere une video et releve des occurrences timecodees sans dupliquer la notion', () => {
    const first = ingestVideoResource({
      actor,
      title: 'Mon tutoriel Storyboard',
      url: 'https://video.example/storyboard',
      durationSeconds: 150,
      software: ['premiere'],
      topics: ['montage'],
      sourceRef: 'local_test',
      segments: [
        {startSeconds: 5, endSeconds: 20, text: 'ici je construis mon storyboard'},
        {startSeconds: 40, endSeconds: 55, text: 'on regle la lumiere et le cadrage'},
      ],
    });

    expect(first.segments).toBe(2);
    expect(first.unchanged).toBe(false);
    expect(first.resourceId.length).toBeGreaterThan(0);

    // Re-ingestion identique : idempotente, aucune nouvelle occurrence, aucune duplication de notion.
    const second = ingestVideoResource({
      actor,
      title: 'Mon tutoriel Storyboard',
      url: 'https://video.example/storyboard',
      durationSeconds: 150,
      software: ['premiere'],
      topics: ['montage'],
      sourceRef: 'local_test',
      segments: [
        {startSeconds: 5, endSeconds: 20, text: 'ici je construis mon storyboard'},
        {startSeconds: 40, endSeconds: 55, text: 'on regle la lumiere et le cadrage'},
      ],
    });

    expect(second.unchanged).toBe(true);
    expect(second.resourceId).toBe(first.resourceId);

    const links = getDb().prepare(
      'SELECT COUNT(*) AS n FROM pedagogical_resource_notion_links WHERE resource_id = ?',
    ).get(first.resourceId) as {n: number};
    expect(links.n).toBeGreaterThanOrEqual(1);
  });

  it('maintient ressource et notion canonique separees de l occurrence', () => {
    const result: IngestVideoResult = ingestVideoResource({
      actor,
      title: 'Lumiere et cadrage',
      url: 'https://video.example/lumiere',
      durationSeconds: 90,
      sourceRef: 'local_test_2',
      segments: [{startSeconds: 10, endSeconds: 30, text: 'la regle des tiers stabilise le cadrage'}],
    });

    const notionRows = getDb().prepare(
      "SELECT notion_id, notion_type FROM pedagogical_notions WHERE notion_type = 'concept'",
    ).all() as Array<{notion_id: string; notion_type: string}>;
    expect(notionRows.length).toBeGreaterThan(0);

    const link = getDb().prepare(
      `SELECT timestamp_seconds FROM pedagogical_resource_notion_links WHERE resource_id = ? AND timestamp_seconds IS NOT NULL LIMIT 1`,
    ).get(result.resourceId) as {timestamp_seconds: number} | undefined;
    expect(link?.timestamp_seconds).toBe(10);
  });
});
