import type { App, CuratedCollection, ListApp, Review } from '../types/app.js';
import { markets } from '../types/constants.js';
import type { RequestOptions } from '../types/options.js';
import {
  detailResponseSchema,
  errorResponseSchema,
  type Comment,
  type CuratedApp,
  type DetailResponse,
} from './schemas.js';

export const BASE_URL = 'https://galaxystore.samsung.com';

const USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';

/**
 * Resolves after `ms`, or rejects early if `signal` aborts.
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error('The operation was aborted'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason ?? new Error('The operation was aborted'));
      },
      { once: true }
    );
  });
}

/**
 * Combines several abort signals into one that aborts as soon as any of them do.
 */
function combineSignals(signals: Array<AbortSignal | undefined>): AbortSignal | undefined {
  const present = signals.filter((s): s is AbortSignal => Boolean(s));
  if (present.length === 0) return undefined;
  if (present.length === 1) return present[0];

  // AbortSignal.any is available on Node 20.3+; fall back to a manual combiner.
  const anyFn = (AbortSignal as unknown as { any?: (s: AbortSignal[]) => AbortSignal }).any;
  if (typeof anyFn === 'function') {
    return anyFn(present);
  }

  const controller = new AbortController();
  for (const s of present) {
    if (s.aborted) {
      controller.abort(s.reason);
      break;
    }
    s.addEventListener('abort', () => controller.abort(s.reason), { once: true });
  }
  return controller.signal;
}

/**
 * Reads a `Retry-After` header (seconds or HTTP date) and returns the delay in
 * milliseconds, or undefined when the header is absent or unparseable.
 */
function retryAfterMs(response: Response): number | undefined {
  const header = response.headers?.get?.('retry-after');
  if (!header) return undefined;

  const seconds = Number(header);
  if (!Number.isNaN(seconds)) return Math.max(0, seconds * 1000);

  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());

  return undefined;
}

/**
 * A response status is worth retrying when the store is rate-limiting (429) or
 * having a transient server-side problem (5xx).
 */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Makes an HTTP request, with optional timeout, retries, cancellation, and a
 * pluggable fetch implementation (see {@link RequestOptions}).
 */
export async function doRequest(url: string, options?: RequestOptions): Promise<string> {
  // The comment list endpoint answers "Access denied" without a Galaxy Store
  // Referer, so it's sent on every request.
  const defaultHeaders: Record<string, string> = {
    'User-Agent': USER_AGENT,
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: `${BASE_URL}/`,
  };

  const fetchImpl = options?.fetch ?? fetch;
  const retries = Math.max(0, options?.retries ?? 0);
  const retryDelay = options?.retryDelay ?? 500;
  const userSignal = options?.signal;

  const backoff = (attempt: number): number => retryDelay * 2 ** attempt;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    // Each attempt gets a fresh timeout so a slow first try doesn't eat the
    // whole budget for the retries.
    const timeoutSignal =
      options?.timeout != null ? AbortSignal.timeout(options.timeout) : undefined;
    const signal = combineSignals([userSignal, timeoutSignal]);

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: 'GET',
        headers: {
          ...defaultHeaders,
          ...(options?.headers || {}),
        },
        ...(signal ? { signal } : {}),
      });
    } catch (error) {
      // A caller-initiated cancel is final — never retry it.
      if (userSignal?.aborted) throw error;
      lastError = error;
      if (attempt < retries) {
        await sleep(backoff(attempt), userSignal);
        continue;
      }
      throw error;
    }

    if (response.ok) {
      return response.text();
    }

    if (isRetryableStatus(response.status) && attempt < retries) {
      const wait = retryAfterMs(response) ?? backoff(attempt);
      await sleep(wait, userSignal);
      continue;
    }

    throw new Error(`Request failed with status ${response.status}`);
  }

  throw lastError ?? new Error('Request failed');
}

/**
 * An error the Galaxy Store reported in its response body (it answers with
 * HTTP 200 and `{ errCode, errMsg }`)
 */
export class GalaxyStoreApiError extends Error {
  constructor(
    /** Store error code, e.g. "9900" (content not registered) */
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'GalaxyStoreApiError';
  }
}

/**
 * Converts a two- or three-letter country code to the alpha-3 `cntyCd` the
 * Galaxy Store expects.
 */
export function countryCode(country = 'us'): string {
  if (/^[a-z]{3}$/i.test(country)) return country.toUpperCase();
  const code = markets[country.toLowerCase()];
  if (!code) {
    throw new Error(`Unknown country code: ${country}`);
  }
  return code;
}

/**
 * Calls a Galaxy Store `/api/...` path for the given country and returns the
 * parsed JSON. The store reports errors as HTTP 200 with an `errCode` body,
 * which are turned into thrown errors here.
 */
export async function apiRequest(
  path: string,
  country?: string,
  requestOptions?: RequestOptions
): Promise<unknown> {
  // The store appends the query to paths like `contentId=X&startNum=1`
  // verbatim, so it can't go through URLSearchParams on the path.
  const url = `${BASE_URL}/api/${path}?cntyCd=${countryCode(country)}`;
  const body = await doRequest(url, requestOptions);
  const data: unknown = JSON.parse(body);

  const error = errorResponseSchema.safeParse(data);
  if (error.success) {
    const { errCode, errMsg } = error.data;
    throw new GalaxyStoreApiError(
      errCode,
      `Galaxy Store API error ${errCode}: ${errMsg ?? ''}`.trim()
    );
  }

  return data;
}

/**
 * Fetches and validates the `/api/detail/{appId}` response
 */
export async function fetchDetail(
  appId: string,
  country?: string,
  requestOptions?: RequestOptions
): Promise<DetailResponse> {
  let data: unknown;
  try {
    data = await apiRequest(`detail/${encodeURIComponent(appId)}`, country, requestOptions);
  } catch (error) {
    // 9900: "this content is not registered at store"
    if (error instanceof GalaxyStoreApiError && error.code === '9900') {
      throw new Error(`App not found: ${appId}`);
    }
    throw error;
  }

  const result = detailResponseSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Galaxy Store API response validation failed: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Returns the trimmed string, or undefined when it's null/empty
 */
function nonEmpty(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Parses the CSS-class style rating ("stars rating-stars-4-5") into 4.5
 */
export function parseRating(value: string | null | undefined): number {
  const match = value?.match(/rating-stars-(\d+)(?:-(\d+))?/);
  if (!match) return 0;
  return Number(`${match[1]}.${match[2] ?? '0'}`);
}

/**
 * Parses a localized price ("€0,00", "$1,299.99", "1.299,99 €", "￦1,200")
 * into a number. A trailing group of one or two digits is the decimal part;
 * any other separator is a thousands separator.
 */
export function parsePrice(value: string | null | undefined): number {
  const digits = value?.replace(/[^\d.,]/g, '') ?? '';
  if (!digits) return 0;

  const match = digits.match(/^(.*)[.,](\d{1,2})$/);
  const whole = (match ? match[1]! : digits).replace(/[.,]/g, '');
  const fraction = match ? match[2]! : '0';
  return Number(`${whole || '0'}.${fraction}`);
}

/**
 * Converts the store's "2026.09.25." date format to ISO "2026-09-25".
 * Unrecognized formats are returned unchanged.
 */
export function parseDate(value: string | null | undefined): string {
  const match = value?.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
  if (!match) return value ?? '';
  return `${match[1]}-${match[2]!.padStart(2, '0')}-${match[3]!.padStart(2, '0')}`;
}

const SIZE_UNITS: Record<string, number> = {
  B: 1,
  KB: 1024,
  MB: 1024 ** 2,
  GB: 1024 ** 3,
};

/**
 * Converts a display size ("125.04 MB") to bytes
 */
export function parseSize(value: string | null | undefined): number {
  const match = value?.match(/([\d.,]+)\s*([KMG]?B)/i);
  if (!match) return 0;
  const amount = Number(match[1]!.replace(',', '.'));
  return Math.round(amount * (SIZE_UNITS[match[2]!.toUpperCase()] ?? 1));
}

/**
 * Splits a pipe-separated list ("A|B|C") into an array
 */
export function splitList(value: string | null | undefined): string[] {
  return (value ?? '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Galaxy Store web URL for a package name
 */
export function appUrl(appId: string): string {
  return `${BASE_URL}/detail/${appId}`;
}

/**
 * Transforms a review/comment entry to our Review format
 */
export function cleanReview(comment: Comment): Review {
  return {
    userName: comment.loginId || '',
    score: parseRating(comment.ratingValueNumber),
    text: comment.commentText || '',
    date: parseDate(comment.createDate),
    updated: parseDate(comment.modifyDate || comment.createDate),
    isDeveloperReply: comment.sellerAnswerFlag === 'true',
  };
}

/**
 * Transforms a curated list entry to our ListApp format
 */
export function cleanListApp(entry: CuratedApp): ListApp {
  const appId = entry.appId || '';
  return {
    id: entry.contentId || '',
    appId,
    title: entry.contentName || '',
    url: appUrl(appId),
    icon: entry.iconURL || '',
    developer: entry.sellerName || '',
    price: parsePrice(entry.localPrice),
    priceText: entry.localPrice || '',
    free: entry.freeFlag === 'Y',
    score: Number(entry.ratingNumber) || parseRating(entry.ratingValue),
  };
}

/**
 * Collects the curated lists referenced by the detail page. Each list has an
 * ID/title pair on `DetailMain` and its apps under `curatedComponentList[id]`.
 */
export function cleanCurated(detail: DetailResponse): CuratedCollection[] {
  const main = detail.DetailMain;
  const components = main.curatedComponentList ?? {};
  const slots = [
    [main.curatedTodayAppsRcuID, main.curatedTodayAppsTitle],
    [main.curatedTogetherAppsRcuID, main.curatedTogetherAppsTitle],
    [main.curatedSimilarAppsRcuID, main.curatedSimilarAppsTitle],
  ] as const;

  const collections: CuratedCollection[] = [];
  const seen = new Set<string>();

  for (const [id, title] of slots) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    collections.push({ id, title: title || '', apps: (components[id] ?? []).map(cleanListApp) });
  }

  // Keep any list the page didn't label, so nothing in the response is dropped.
  for (const [id, apps] of Object.entries(components)) {
    if (seen.has(id)) continue;
    collections.push({ id, title: '', apps: apps.map(cleanListApp) });
  }

  return collections;
}

/**
 * Transforms a Galaxy Store detail response to our App format
 */
export function cleanApp(detail: DetailResponse): App {
  const main = detail.DetailMain;
  const seller = detail.SellerInfo;
  const shots = detail.Screenshot?.scrnShtUrlList ?? [];
  const appId = main.appId || detail.appId || '';
  const onSale = main.discountFlag === 'Y';

  return {
    id: main.contentId || detail.contentId || '',
    appId,
    title: main.contentName || '',
    url: appUrl(appId),
    summary: main.shortDescription || '',
    description: main.contentDescription || '',
    releaseNotes: main.contentNewDescription || '',
    icon: main.iconURL || main.contentImgURL || '',
    iconSmall: main.contentImgURL || main.iconURL || '',
    screenshots: shots.map((s) => s.originalScrnShtUrl || s.smallScrnShtUrl || '').filter(Boolean),
    screenshotThumbnails: shots
      .map((s) => s.smallScrnShtUrl || s.originalScrnShtUrl || '')
      .filter(Boolean),
    headerImage: nonEmpty(main.cnvrnImgUrl),
    video: nonEmpty(main.youtubeUrl),
    videoImage: nonEmpty(main.youtubeImgUrl),
    genre: main.generalCategoryName || '',
    genreId: main.generalCategoryId || '',
    categoryPath: main.categoryPath || '',
    contentType: main.contentType || '',
    contentRating: main.limitAgeCd || '',
    contentRatingDetail: nonEmpty(main.limitAgeDetail),
    version: main.contentBinaryVersion || '',
    size: main.contentBinarySize || '',
    sizeBytes: parseSize(main.contentBinarySize),
    updated: parseDate(main.modifyDate),
    price: parsePrice(main.localPrice),
    priceText: main.localPrice || '',
    discountPrice: onSale ? parsePrice(main.discountPrice) : undefined,
    discountPriceText: onSale ? nonEmpty(main.discountPrice) : undefined,
    currency: main.currencyUnit || '',
    free: main.freeFlag === 'Y',
    offersIAP: main.itemPurchaseFlag === 'Y',
    watchApp: main.contentBinaryWatchType === 'Y',
    score: Number(main.ratingNumber) || parseRating(main.ratingValue),
    ratings: Number(main.commentListTotalCount) || 0,
    starSum: Number(main.starSum) || 0,
    developerId: main.sellerId || '',
    developer: main.sellerName || '',
    copyright: main.copyrightHolder || '',
    developerWebsite: nonEmpty(main.developerSite) ?? nonEmpty(main.sellerSite),
    developerEmail: nonEmpty(main.customerSupportEmail),
    privacyPolicy: nonEmpty(main.sellerPrivatePolicy),
    seller: {
      tradeName: nonEmpty(seller?.sellerTradeName),
      representative: nonEmpty(seller?.representation),
      sellerNumber: nonEmpty(seller?.sellerNumber),
      registrationNumber: nonEmpty(seller?.registrationNumber),
      reportNumber: nonEmpty(seller?.reportNumber),
      address: [seller?.firstSellerAddress, seller?.secondSellerAddress]
        .map(nonEmpty)
        .filter((line): line is string => Boolean(line)),
      website: nonEmpty(seller?.sellerSite),
    },
    dataSafety: {
      collected: splitList(main.dataSafetyCollected),
      shared: splitList(main.dataSafetyShared),
    },
    permissions: main.permissionList ?? [],
    deepLink: main.deeplinkUrl || '',
    country: main.countryCode || '',
    curated: cleanCurated(detail),
    recentReviews: (detail.commentList ?? []).map(cleanReview),
  };
}

/**
 * Validates that at least one of the required fields is present
 */
export function validateRequiredField(
  options: Record<string, unknown>,
  fields: string[],
  errorMessage: string
): void {
  const hasField = fields.some((field) => options[field] !== undefined);
  if (!hasField) {
    throw new Error(errorMessage);
  }
}
