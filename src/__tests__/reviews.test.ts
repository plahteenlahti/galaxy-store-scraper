import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fetchJson, itNetwork } from './helpers.js';
import { reviews } from '../lib/reviews.js';

const detail: unknown = JSON.parse(
  readFileSync(new URL('./fixtures/detail.json', import.meta.url), 'utf8')
);

const commentList = {
  commentList: [
    {
      modifyDate: '2026.10.01.',
      createDate: '2026.10.01.',
      userId: null,
      commentText: 'Fun',
      commentStatudCode: null,
      sellerAnswerFlag: 'false',
      registerTypeCode: null,
      ratingValueNumber: 'stars rating-stars-5',
      loginId: 'abc**',
    },
  ],
};

describe('reviews', () => {
  it('should throw error when neither id nor appId is provided', async () => {
    await expect(reviews({})).rejects.toThrow('Either id or appId is required');
  });

  it('should reject invalid pages', async () => {
    await expect(reviews({ id: '000009210018', page: 0 })).rejects.toThrow(
      'Page must be a positive integer'
    );
  });

  it('requests the comment list by content ID and maps reviews', async () => {
    const stub = fetchJson(commentList);
    const result = await reviews({ id: '000008248552', requestOptions: { fetch: stub.fetch } });

    expect(stub.urls).toEqual([
      'https://galaxystore.samsung.com/api/commentList/contentId=000008248552&startNum=1?cntyCd=USA',
    ]);
    expect(result).toEqual([
      {
        userName: 'abc**',
        score: 5,
        text: 'Fun',
        date: '2026-10-01',
        updated: '2026-10-01',
        isDeveloperReply: false,
      },
    ]);
  });

  it('pages 15 reviews at a time', async () => {
    const stub = fetchJson(commentList);
    await reviews({
      id: '000008248552',
      page: 3,
      country: 'de',
      requestOptions: { fetch: stub.fetch },
    });

    expect(stub.urls[0]).toBe(
      'https://galaxystore.samsung.com/api/commentList/contentId=000008248552&startNum=31?cntyCd=DEU'
    );
  });

  it('resolves a package name to a content ID first', async () => {
    const stub = fetchJson(detail, commentList);
    await reviews({ appId: 'studio.happycode.puking_cat', requestOptions: { fetch: stub.fetch } });

    expect(stub.urls).toHaveLength(2);
    expect(stub.urls[1]).toContain('contentId=000009210018&startNum=1');
  });

  it('returns an empty array past the last page', async () => {
    const stub = fetchJson({ commentList: [] });
    const result = await reviews({
      id: '000009210018',
      page: 99,
      requestOptions: { fetch: stub.fetch },
    });
    expect(result).toEqual([]);
  });

  itNetwork('should fetch reviews for a popular app', { timeout: 15000 }, async () => {
    const page1 = await reviews({ appId: 'com.roblox.client.samsunggalaxy' });
    const page2 = await reviews({ id: '000008248552', page: 2 });

    expect(page1.length).toBeGreaterThan(0);
    expect(page1.length).toBeLessThanOrEqual(15);
    expect(page2.length).toBeGreaterThan(0);
    expect(page1[0]?.score).toBeGreaterThanOrEqual(0);
    expect(page1[0]?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
