import type { Review } from '../types/app.js';
import type { ReviewsOptions } from '../types/options.js';
import { apiRequest, cleanReview, fetchDetail, validateRequiredField } from './common.js';
import { commentListResponseSchema } from './schemas.js';

/** The Galaxy Store serves reviews 15 at a time */
export const REVIEWS_PAGE_SIZE = 15;

/**
 * Retrieves user reviews for an app, newest first
 * @param options - Options including the content ID or package name, and page
 * @returns Promise resolving to array of reviews (empty past the last page)
 *
 * @example
 * ```typescript
 * // Get the latest reviews by package name
 * const latest = await reviews({ appId: 'com.roblox.client.samsunggalaxy' });
 *
 * // Get page 3 by content ID (skips the package name lookup)
 * const older = await reviews({ id: '000008248552', page: 3 });
 * ```
 */
export async function reviews(options: ReviewsOptions): Promise<Review[]> {
  validateRequiredField(
    options as Record<string, unknown>,
    ['id', 'appId'],
    'Either id or appId is required'
  );

  const { appId, page = 1, country, requestOptions } = options;
  let { id } = options;

  if (!Number.isInteger(page) || page < 1) {
    throw new Error('Page must be a positive integer');
  }

  // Reviews are keyed by content ID, so a package name needs a detail lookup
  if (appId && !id) {
    const detail = await fetchDetail(appId, country, requestOptions);
    id = detail.DetailMain.contentId || detail.contentId || undefined;
  }

  if (!id) {
    throw new Error('Could not resolve content id');
  }

  const startNum = (page - 1) * REVIEWS_PAGE_SIZE + 1;
  const data = await apiRequest(
    `commentList/contentId=${encodeURIComponent(id)}&startNum=${startNum}`,
    country,
    requestOptions
  );

  const result = commentListResponseSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Galaxy Store API response validation failed: ${result.error.message}`);
  }

  return (result.data.commentList ?? []).map(cleanReview);
}
