import type { ListApp } from '../types/app.js';
import type { SimilarOptions } from '../types/options.js';
import { cleanCurated, fetchDetail, validateRequiredField } from './common.js';

/**
 * Retrieves the apps the Galaxy Store recommends on an app's detail page
 * (all curated lists combined, de-duplicated, in page order). Use
 * `app().curated` to keep the lists and their titles separate.
 * @param options - Options including the app's package name
 * @returns Promise resolving to array of apps
 *
 * @example
 * ```typescript
 * const related = await similar({ appId: 'studio.happycode.puking_cat' });
 * ```
 */
export async function similar(options: SimilarOptions): Promise<ListApp[]> {
  validateRequiredField(
    options as unknown as Record<string, unknown>,
    ['appId'],
    'appId is required'
  );

  const { appId, country, requestOptions } = options;
  const detail = await fetchDetail(appId, country, requestOptions);

  const seen = new Set<string>([appId]);
  return cleanCurated(detail)
    .flatMap((collection) => collection.apps)
    .filter((entry) => {
      if (seen.has(entry.appId)) return false;
      seen.add(entry.appId);
      return true;
    });
}
