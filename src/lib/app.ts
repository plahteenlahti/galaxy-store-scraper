import type { App } from '../types/app.js';
import type { AppOptions } from '../types/options.js';
import { cleanApp, fetchDetail, validateRequiredField } from './common.js';

/**
 * Retrieves detailed information about an app from the Galaxy Store
 * @param options - Options including the app's package name
 * @returns Promise resolving to app details
 * @throws Error if appId is missing or the app isn't in the store
 *
 * @example
 * ```typescript
 * // Get app by package name
 * const result = await app({ appId: 'studio.happycode.puking_cat' });
 *
 * // Get the Finnish storefront (prices in EUR, localized labels)
 * const result = await app({ appId: 'studio.happycode.puking_cat', country: 'fi' });
 * ```
 */
export async function app(options: AppOptions): Promise<App> {
  validateRequiredField(
    options as unknown as Record<string, unknown>,
    ['appId'],
    'appId is required'
  );

  const { appId, country, requestOptions } = options;
  const detail = await fetchDetail(appId, country, requestOptions);
  return cleanApp(detail);
}
