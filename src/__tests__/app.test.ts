import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fetchJson, itNetwork } from './helpers.js';
import { app } from '../lib/app.js';
import { GalaxyStoreApiError } from '../lib/common.js';

const detail: unknown = JSON.parse(
  readFileSync(new URL('./fixtures/detail.json', import.meta.url), 'utf8')
);

describe('app', () => {
  it('should throw error when appId is not provided', async () => {
    await expect(app({} as never)).rejects.toThrow('appId is required');
  });

  it('requests the detail API with the country code and a store Referer', async () => {
    const stub = fetchJson(detail);
    await app({
      appId: 'studio.happycode.puking_cat',
      country: 'fi',
      requestOptions: { fetch: stub.fetch },
    });

    expect(stub.urls[0]).toBe(
      'https://galaxystore.samsung.com/api/detail/studio.happycode.puking_cat?cntyCd=FIN'
    );
    const headers = stub.inits[0]?.headers as Record<string, string>;
    expect(headers.Referer).toBe('https://galaxystore.samsung.com/');
  });

  it('maps the detail response to an App', async () => {
    const stub = fetchJson(detail);
    const result = await app({
      appId: 'studio.happycode.puking_cat',
      requestOptions: { fetch: stub.fetch },
    });

    expect(result).toMatchObject({
      id: '000009210018',
      appId: 'studio.happycode.puking_cat',
      title: 'Puking Cat: Messy Physics Game',
      url: 'https://galaxystore.samsung.com/detail/studio.happycode.puking_cat',
      summary: 'Aim the cat. Splat the furniture. Mind the aquarium.',
      genre: 'Casual',
      genreId: 'G000060950',
      categoryPath: 'Games > Casual',
      contentType: '17',
      contentRating: '4',
      version: '2.8.1',
      size: '125.04 MB',
      updated: '2026-09-25',
      price: 0,
      priceText: '$0.00',
      currency: '$',
      free: true,
      offersIAP: true,
      watchApp: false,
      score: 5,
      ratings: 1,
      starSum: 1,
      developerId: 'xvfs7fmivh',
      developer: 'HAPPY SIA',
      copyright: 'HAPPY SIA',
      developerWebsite: 'https://happycode.studio',
      developerEmail: 'info@happycode.studio',
      privacyPolicy: 'https://happycode.studio/terms/apps/Puking-Cat',
      country: 'USA',
      deepLink: 'samsungapps://ProductDetail/studio.happycode.puking_cat?gsw_source=GSWebToDetail',
    });

    expect(result.description).toContain('Puking Cat is a funny cat game');
    expect(result.releaseNotes).toContain('A small fix for Galaxy.');
    expect(result.icon).toMatch(/_512_512\.png$/);
    expect(result.video).toBeUndefined();
    expect(result.discountPrice).toBeUndefined();
  });

  it('maps screenshots, seller info and data safety', async () => {
    const stub = fetchJson(detail);
    const result = await app({
      appId: 'studio.happycode.puking_cat',
      requestOptions: { fetch: stub.fetch },
    });

    expect(result.screenshots).toHaveLength(8);
    expect(result.screenshotThumbnails).toHaveLength(8);
    expect(result.screenshots[0]).toMatch(/ScreenShot_.*_1\.png$/);

    expect(result.seller).toEqual({
      tradeName: 'HAPPY SIA',
      representative: 'Kacevica Ivanna',
      sellerNumber: 'LVA67201190',
      registrationNumber: undefined,
      reportNumber: undefined,
      address: ['37 - 13 Marupes iela'],
      website: 'https://happycode.studio',
    });

    expect(result.dataSafety.collected).toContain('App activity');
    expect(result.dataSafety.shared.length).toBeGreaterThan(0);
  });

  it('maps curated lists and embedded reviews', async () => {
    const stub = fetchJson(detail);
    const result = await app({
      appId: 'studio.happycode.puking_cat',
      requestOptions: { fetch: stub.fetch },
    });

    expect(result.curated).toHaveLength(1);
    expect(result.curated[0]).toMatchObject({ id: '131', title: "Today's top" });
    expect(result.curated[0]?.apps).toHaveLength(3);
    const first = result.curated[0]?.apps[0];
    expect(first?.appId).toBeTruthy();
    expect(first?.url).toBe(`https://galaxystore.samsung.com/detail/${first?.appId}`);
    expect(first?.free).toBe(true);

    expect(result.recentReviews).toEqual([
      {
        userName: 'test**',
        score: 4.5,
        text: 'Great game',
        date: '2026-09-28',
        updated: '2026-09-30',
        isDeveloperReply: false,
      },
      {
        userName: '',
        score: 0,
        text: 'Thanks!',
        date: '2026-09-29',
        updated: '2026-09-29',
        isDeveloperReply: true,
      },
    ]);
  });

  it('throws "App not found" for unknown packages', async () => {
    const stub = fetchJson({ errCode: '9900', errMsg: 'this content is not registered at store' });
    await expect(
      app({ appId: 'does.not.exist', requestOptions: { fetch: stub.fetch } })
    ).rejects.toThrow('App not found: does.not.exist');
  });

  it('throws a GalaxyStoreApiError for other store errors', async () => {
    const stub = fetchJson({ errCode: 'E4002', errMsg: 'not available' });
    const error: unknown = await app({
      appId: 'studio.happycode.puking_cat',
      requestOptions: { fetch: stub.fetch },
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GalaxyStoreApiError);
    expect((error as GalaxyStoreApiError).code).toBe('E4002');
  });

  itNetwork('should fetch app by package name', { timeout: 10000 }, async () => {
    const result = await app({ appId: 'studio.happycode.puking_cat' });

    expect(result.appId).toBe('studio.happycode.puking_cat');
    expect(result.id).toMatch(/^\d+$/);
    expect(result.title).toBeTruthy();
    expect(result.developer).toBeTruthy();
    expect(result.country).toBe('USA');
    expect(result.screenshots.length).toBeGreaterThan(0);
  });

  itNetwork('should honor the country option', { timeout: 10000 }, async () => {
    const result = await app({ appId: 'studio.happycode.puking_cat', country: 'fi' });

    expect(result.country).toBe('FIN');
    expect(result.currency).toBe('€');
  });

  itNetwork('should throw for an unknown package', { timeout: 10000 }, async () => {
    await expect(app({ appId: 'does.not.exist.galaxy.scraper' })).rejects.toThrow('App not found');
  });
});
