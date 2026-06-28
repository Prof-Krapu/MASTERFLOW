import {describe, expect, it} from 'vitest';

import type {ThemePack} from '@masterflow/shared';

import {lintThemePack} from '../src/engines/theme_lint.ts';

function theme(overrides: Partial<ThemePack> = {}): ThemePack {
  return {
    theme_id: 'theme-test',
    version: '1.0.0',
    label: 'Theme test',
    scope: 'user',
    scope_id: 'user-1',
    status: 'candidate',
    palette: {
      primary: '#2B1B3D',
      surface: '#FFFFFF',
      text: '#111111',
      accent: '#FFB000',
    },
    token_aliases: {
      action: '{palette.accent}',
      actionText: '{palette.text}',
    },
    fonts: {
      body: {
        family: 'Inter',
        source_ref: 'https://fonts.google.com/specimen/Inter',
        license_status: 'known',
        fallback_family: 'sans-serif',
      },
      heading: {
        family: 'Inter',
        source_ref: 'https://fonts.google.com/specimen/Inter',
        license_status: 'known',
        fallback_family: 'sans-serif',
      },
      display: null,
    },
    contrast_pairs: [
      {
        pair_id: 'body',
        foreground: '{palette.text}',
        background: '{palette.surface}',
        usage: 'normal_text',
      },
    ],
    asset_refs: [],
    source_refs: ['user:theme-test'],
    ...overrides,
  };
}

describe('theme lint', () => {
  it('valide un thème sourcé, résolu et contrasté', () => {
    const report = lintThemePack(theme());
    expect(report.valid).toBe(true);
    expect(report.findings).toEqual([]);
  });

  it('refuse une couleur invalide au lieu de la considérer comme parfaite', () => {
    const report = lintThemePack(theme({
      palette: {
        primary: '#2B1B3D',
        surface: 'white-ish',
        text: '#111111',
        accent: '#FFB000',
      },
    }));
    expect(report.valid).toBe(false);
    expect(report.findings).toContainEqual(
      expect.objectContaining({code: 'invalid_color', path: 'palette.surface'}),
    );
  });

  it('détecte les références absentes et les cycles', () => {
    const report = lintThemePack(theme({
      token_aliases: {
        missing: '{tokens.unknown}',
        loopA: '{tokens.loopB}',
        loopB: '{tokens.loopA}',
      },
    }));
    expect(report.valid).toBe(false);
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(['broken_token_reference', 'cyclic_token_reference']),
    );
  });

  it('signale contraste faible et licence de fonte inconnue', () => {
    const base = theme();
    const report = lintThemePack(theme({
      palette: {
        ...base.palette,
        surface: '#FFFFFF',
        text: '#F4F4F4',
      },
      fonts: {
        ...base.fonts,
        body: {
          ...base.fonts.body,
          source_ref: null,
          license_status: 'unknown',
        },
      },
    }));
    expect(report.valid).toBe(false);
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({code: 'insufficient_contrast'}),
        expect.objectContaining({code: 'font_source_missing'}),
        expect.objectContaining({code: 'font_license_unknown'}),
      ]),
    );
  });
});
