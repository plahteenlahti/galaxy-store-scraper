/**
 * @perttu/galaxy-store-scraper
 * Modern TypeScript library to scrape application data from the Samsung Galaxy Store
 */

// Export all API methods
export { app } from './lib/app.js';
export { reviews } from './lib/reviews.js';
export { similar } from './lib/similar.js';

// Export errors
export { GalaxyStoreApiError } from './lib/common.js';

// Export types
export type {
  App,
  ListApp,
  CuratedCollection,
  SellerInfo,
  DataSafety,
  Review,
  RequestOptions,
  BaseOptions,
  AppOptions,
  ReviewsOptions,
  SimilarOptions,
} from './types/index.js';

// Export constants
export { markets } from './types/index.js';
