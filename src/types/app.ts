/**
 * Represents a complete app from the Samsung Galaxy Store
 */
export interface App {
  /** Galaxy Store content ID (zero-padded numeric string, e.g. "000009210018") */
  id: string;
  /** Android package name (e.g., studio.happycode.puking_cat) */
  appId: string;
  /** App name/title */
  title: string;
  /** Galaxy Store web URL */
  url: string;
  /** Short one-line description */
  summary: string;
  /** Full app description */
  description: string;
  /** Latest version release notes ("What's new") */
  releaseNotes: string;
  /** App icon URL (512x512) */
  icon: string;
  /** Small app icon URL (95x95) */
  iconSmall: string;
  /** Full-size screenshot URLs */
  screenshots: string[];
  /** Thumbnail screenshot URLs, in the same order as `screenshots` */
  screenshotThumbnails: string[];
  /** Feature/banner image URL, when the app has one */
  headerImage?: string;
  /** YouTube promo video URL, when the app has one */
  video?: string;
  /** YouTube promo video thumbnail URL */
  videoImage?: string;
  /** Primary category name (e.g., "Casual") */
  genre: string;
  /** Primary category ID (e.g., "G000060775") */
  genreId: string;
  /** Full category path (e.g., "Games > Casual") */
  categoryPath: string;
  /** Galaxy Store content type code ("17" for games, etc.) */
  contentType: string;
  /** Age rating code as shown by the store (e.g., "4", "12", "19") */
  contentRating: string;
  /** Extra age rating detail, when provided */
  contentRatingDetail?: string;
  /** Current version number */
  version: string;
  /** Download size as displayed by the store (e.g., "125.04 MB") */
  size: string;
  /** Download size in bytes, derived from `size` */
  sizeBytes: number;
  /** Last update date (ISO "YYYY-MM-DD") */
  updated: string;
  /** Price as a number in the local currency */
  price: number;
  /** Formatted, localized price (e.g., "€0,00") */
  priceText: string;
  /** Discounted price as a number, when the app is on sale */
  discountPrice?: number;
  /** Formatted discounted price, when the app is on sale */
  discountPriceText?: string;
  /** Currency symbol as returned by the store (e.g., "€", "$") */
  currency: string;
  /** Whether the app is free */
  free: boolean;
  /** Whether the app offers in-app purchases */
  offersIAP: boolean;
  /** Whether the app has a Galaxy Watch build */
  watchApp: boolean;
  /** Average user rating as displayed (0-5, rounded to 0.5) */
  score: number;
  /** Total number of ratings/reviews */
  ratings: number;
  /**
   * Raw `starSum` from the store. For most apps `starSum / ratings` is the
   * unrounded average, but it isn't always consistent with `score`.
   */
  starSum: number;
  /** Seller ID */
  developerId: string;
  /** Seller name */
  developer: string;
  /** Copyright holder */
  copyright: string;
  /** Developer website URL */
  developerWebsite?: string;
  /** Developer support email */
  developerEmail?: string;
  /** Developer privacy policy URL */
  privacyPolicy?: string;
  /** Legal seller details shown on the store page */
  seller: SellerInfo;
  /** Data safety disclosures */
  dataSafety: DataSafety;
  /** Requested Android permissions */
  permissions: unknown[];
  /** Store deep link that opens the app page in the Galaxy Store app */
  deepLink: string;
  /** Country the data was served for (ISO 3166-1 alpha-3, e.g., "USA") */
  country: string;
  /** Curated app collections shown on the page (e.g., "Today's top") */
  curated: CuratedCollection[];
  /** The most recent reviews (first page), embedded in the detail response */
  recentReviews: Review[];
}

/**
 * Legal seller details from the Galaxy Store page
 */
export interface SellerInfo {
  /** Registered trade name */
  tradeName?: string;
  /** Legal representative */
  representative?: string;
  /** Seller/VAT number */
  sellerNumber?: string;
  /** Company registration number */
  registrationNumber?: string;
  /** Business report number */
  reportNumber?: string;
  /** Postal address lines */
  address: string[];
  /** Seller website URL */
  website?: string;
}

/**
 * Data safety disclosures. Labels are localized to the requested country.
 */
export interface DataSafety {
  /** Data types the app collects */
  collected: string[];
  /** Data types the app shares with third parties */
  shared: string[];
}

/**
 * A curated collection of apps shown on an app's detail page
 */
export interface CuratedCollection {
  /** Collection ID */
  id: string;
  /** Localized collection title (e.g., "Today's top") */
  title: string;
  /** Apps in the collection */
  apps: ListApp[];
}

/**
 * A lightweight app record, as it appears in curated lists
 */
export interface ListApp {
  /** Galaxy Store content ID */
  id: string;
  /** Android package name */
  appId: string;
  /** App name/title */
  title: string;
  /** Galaxy Store web URL */
  url: string;
  /** App icon URL */
  icon: string;
  /** Seller name */
  developer: string;
  /** Price as a number in the local currency */
  price: number;
  /** Formatted, localized price */
  priceText: string;
  /** Whether the app is free */
  free: boolean;
  /** Average user rating (0-5) */
  score: number;
}

/**
 * Represents a user review from the Galaxy Store
 */
export interface Review {
  /** Masked reviewer login (e.g., "rick**") */
  userName: string;
  /** Star rating (0-5, in 0.5 steps) */
  score: number;
  /** Review body text */
  text: string;
  /** Review creation date (ISO "YYYY-MM-DD") */
  date: string;
  /** Last edit date (ISO "YYYY-MM-DD") */
  updated: string;
  /** Whether this entry is the seller's reply rather than a user review */
  isDeveloperReply: boolean;
}
