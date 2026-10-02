export interface RequestOptions {
  /** Extra headers merged over the defaults */
  headers?: Record<string, string>;
  /**
   * Abort the request if it takes longer than this many milliseconds.
   * Each retry attempt gets its own timeout. Omit for no timeout.
   */
  timeout?: number;
  /**
   * Number of times to retry after a retryable failure (HTTP 429, HTTP 5xx,
   * or a network/timeout error). Defaults to 0 (no retries).
   */
  retries?: number;
  /**
   * Base delay in milliseconds between retries. The delay grows exponentially
   * (delay * 2^attempt). A `Retry-After` header on a 429/503 response takes
   * precedence. Defaults to 500.
   */
  retryDelay?: number;
  /**
   * An AbortSignal to cancel the request. When it aborts, the request rejects
   * immediately and no further retries are attempted.
   */
  signal?: AbortSignal;
  /**
   * Custom fetch implementation, e.g. one bound to a proxy agent. Defaults to
   * the global `fetch`.
   */
  fetch?: typeof fetch;
}

/**
 * Common options for requests
 */
export interface BaseOptions {
  /**
   * Country code, two-letter ("us") or three-letter ("USA"). Defaults to
   * "us". Prices, currency, and localized labels (data safety, curated list
   * titles) follow the country. Without it, the Galaxy Store picks a
   * storefront from the caller's IP address.
   */
  country?: string;
  /** Custom request options */
  requestOptions?: RequestOptions;
}

/**
 * Options for the app() method
 */
export interface AppOptions extends BaseOptions {
  /** Android package name (e.g., studio.happycode.puking_cat) */
  appId: string;
}

/**
 * Options for the reviews() method
 */
export interface ReviewsOptions extends BaseOptions {
  /** Galaxy Store content ID (e.g., "000009210018") */
  id?: string;
  /** Android package name, resolved to a content ID with an extra request */
  appId?: string;
  /** Page number, 15 reviews per page (default: 1) */
  page?: number;
}

/**
 * Options for the similar() method
 */
export interface SimilarOptions extends BaseOptions {
  /** Android package name */
  appId: string;
}
