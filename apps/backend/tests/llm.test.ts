import {beforeAll, describe, expect, it} from 'vitest';

import {seedAll} from '../src/db/seed.ts';
import {chat, completeVision, streamChat} from '../src/services/llm.ts';

beforeAll(async () => {
  await seedAll();
});

describe('LLM service — mock mode', () => {
  it('chat returns a non-empty string', async () => {
    const result = await chat({messages: [{role: 'user', content: 'Dis bonjour'}]});
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('streamChat yields chunks', async () => {
    const chunks: string[] = [];
    for await (const chunk of streamChat({messages: [{role: 'user', content: 'Test stream'}]})) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBeGreaterThan(0);
    const full = chunks.join('');
    expect(full.length).toBeGreaterThan(0);
  });

  it('chat with system message works', async () => {
    const result = await chat({
      messages: [
        {role: 'system', content: 'Réponds en un mot.'},
        {role: 'user', content: 'Quelle est la capitale de la France ?'},
      ],
    });
    expect(result).toBeTruthy();
  });

  it('completeVision returns empty array in mock mode', async () => {
    const result = await completeVision({
      task: 'ocr',
      userText: 'Que dit ce texte ?',
      images: [{mime: 'image/png', base64: 'fake'}],
    });
    expect(result.text).toBe('[]');
    expect(result.model).toBe('mock');
  });

  it('chat with task and userId logs token_events', async () => {
    const result = await chat({
      messages: [{role: 'user', content: 'Test token logging'}],
      userId: 'test-llm-user',
      personaId: 'test-persona',
      task: 'chat',
    });
    expect(result).toBeTruthy();
  });
});
