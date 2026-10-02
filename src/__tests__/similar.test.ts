import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fetchJson, itNetwork } from './helpers.js';
import { similar } from '../lib/similar.js';

const detail = JSON.parse(
  readFileSync(new URL('./fixtures/detail.json', import.meta.url), 'utf8')
) as { DetailMain: Record<string, unknown> };

describe('similar', () => {
  it('should throw error when appId is not provided', async () => {
    await expect(similar({} as never)).rejects.toThrow('appId is required');
  });

  it('flattens curated lists from the detail response', async () => {
    const stub = fetchJson(detail);
    const result = await similar({
      appId: 'studio.happycode.puking_cat',
      requestOptions: { fetch: stub.fetch },
    });

    expect(result).toHaveLength(3);
    expect(result.every((entry) => entry.appId && entry.title)).toBe(true);
  });

  it('drops duplicates and the app itself', async () => {
    const entry = (appId: string) => ({ contentId: '1', appId, contentName: appId });
    const stub = fetchJson({
      ...detail,
      DetailMain: {
        ...detail.DetailMain,
        curatedTodayAppsRcuID: '1',
        curatedSimilarAppsRcuID: '2',
        curatedComponentList: {
          '1': [entry('a'), entry('studio.happycode.puking_cat')],
          '2': [entry('a'), entry('b')],
        },
      },
    });
    const result = await similar({
      appId: 'studio.happycode.puking_cat',
      requestOptions: { fetch: stub.fetch },
    });

    expect(result.map((r) => r.appId)).toEqual(['a', 'b']);
  });

  itNetwork('should fetch related apps', { timeout: 10000 }, async () => {
    const result = await similar({ appId: 'com.roblox.client.samsunggalaxy' });

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]?.appId).toBeTruthy();
  });
});
