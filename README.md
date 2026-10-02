# @perttu/galaxy-store-scraper

Modern TypeScript library to scrape application data from the Samsung Galaxy Store.

A sibling of [@perttu/app-store-scraper](https://github.com/plahteenlahti/app-store-scraper), with the same conventions: native `fetch`, Zod-validated responses, and dual ESM/CJS builds.

## Features

- 🎯 **Full TypeScript support** with comprehensive type definitions
- ✅ **Runtime validation** of every response with [Zod](https://zod.dev)
- 📦 **Dual ESM/CJS support** for maximum compatibility
- 🌍 **Per-country storefronts** for prices, currency, and localized labels
- 🔁 **Retries, timeouts, cancellation, and pluggable `fetch`** on every call

## Installation

```bash
npm install @perttu/galaxy-store-scraper
```

## Usage

```typescript
import { app, reviews, similar } from '@perttu/galaxy-store-scraper';

// Full app details by package name
const cat = await app({ appId: 'studio.happycode.puking_cat' });
console.log(cat.title, cat.version, cat.priceText, cat.screenshots.length);

// Another storefront: prices in EUR, data safety labels in Finnish
const fi = await app({ appId: 'studio.happycode.puking_cat', country: 'fi' });

// Reviews, newest first, 15 per page
const latest = await reviews({ appId: 'com.roblox.client.samsunggalaxy' });
const older = await reviews({ id: '000008248552', page: 3 }); // content ID skips a lookup

// Apps the store recommends on the detail page
const related = await similar({ appId: 'studio.happycode.puking_cat' });
```

### Methods

- `app()` - Get detailed app information: descriptions, release notes, icons, screenshots, category, age rating, version, size, price, rating, developer and legal seller details, data safety, permissions, curated lists, and the latest reviews
- `reviews()` - Get user reviews, 15 per page. Accepts a content ID (`id`) or a package name (`appId`, which costs one extra request)
- `similar()` - Get the apps from every curated list on the detail page, de-duplicated. `app().curated` keeps the lists and their titles separate

### Countries

`country` accepts a two-letter (`'us'`) or three-letter (`'USA'`) code and defaults to `'us'`. The Galaxy Store localizes prices, currency, data safety labels, and curated list titles per country, but app titles and descriptions stay as the developer published them. The two-letter codes are mapped through the exported `markets` table.

### Errors

- An unknown package name throws `App not found: <appId>`.
- Any other error the store reports in the response body throws a `GalaxyStoreApiError`, with the store's code in `error.code`.

### Request options

Every method accepts `requestOptions` to control the underlying HTTP request:

```typescript
const result = await app({
  appId: 'studio.happycode.puking_cat',
  requestOptions: {
    timeout: 5000, // abort a request after 5s (per attempt)
    retries: 3, // retry up to 3× on 429 / 5xx / network errors
    retryDelay: 500, // base backoff in ms, doubles each attempt; Retry-After wins
    signal: controller.signal, // AbortSignal to cancel (no further retries)
    fetch: myProxiedFetch, // custom fetch, e.g. bound to a proxy agent
    headers: { 'X-Custom': '1' },
  },
});
```

| Option | Default | Notes |
| --- | --- | --- |
| `timeout` | none | Milliseconds; each retry attempt gets a fresh timeout |
| `retries` | `0` | Retries after HTTP 429, HTTP 5xx, or a network/timeout error |
| `retryDelay` | `500` | Base backoff in ms; grows as `retryDelay * 2^attempt`. A `Retry-After` header takes precedence |
| `signal` | none | Cancels the request; an aborted signal is never retried |
| `fetch` | global `fetch` | Inject a proxied/instrumented fetch |
| `headers` | — | Merged over the default headers |

## How it works

The Galaxy Store web app is backed by two JSON endpoints, which this library calls directly:

| Endpoint | Used by |
| --- | --- |
| `GET /api/detail/{packageName}?cntyCd={ISO3}` | `app()`, `similar()`, and `reviews()` when given a package name |
| `GET /api/commentList/contentId={id}&startNum={n}?cntyCd={ISO3}` | `reviews()` |

The review endpoint answers `Access denied` unless the request carries a Galaxy Store `Referer`, which the library sends by default.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run example (tests all methods)
npm run example

# Type check
npm run typecheck

# Lint
npm run lint

# Format code
npm run format
```

### Testing

Tests are split into two groups:

- **Unit tests** run against mocked `fetch` and a captured detail response in `src/__tests__/fixtures`. These run on every pull request.

  ```bash
  npm run test:run
  ```

- **Live-network tests** hit the real Galaxy Store. They are **skipped by default** and run on a weekly schedule rather than gating PRs. Run them locally (sets `RUN_NETWORK_TESTS=1`) with:

  ```bash
  npm run test:network
  ```

## License

MIT
