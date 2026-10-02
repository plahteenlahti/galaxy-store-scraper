import { it, vi } from 'vitest';

/**
 * Marks a test that hits Samsung's live Galaxy Store endpoints
 * (galaxystore.samsung.com).
 *
 * These are **skipped by default** — including on pull-request CI — because
 * live responses vary by region and change over time, which makes them flaky
 * and unable to gate merges reliably.
 *
 * They run only when `RUN_NETWORK_TESTS=1` is set, which the weekly workflow
 * does. Run them locally with:
 *
 * ```sh
 * npm run test:network
 * ```
 */
export const itNetwork: ReturnType<typeof it.runIf> = it.runIf(
  process.env.RUN_NETWORK_TESTS === '1'
);

/**
 * Builds a fetch stub that answers every request with the given JSON bodies
 * in order, and records the requested URLs and init objects.
 */
export function fetchJson(...bodies: unknown[]) {
  const urls: string[] = [];
  const inits: RequestInit[] = [];
  let i = 0;
  const impl = vi.fn((url: string, init: RequestInit) => {
    urls.push(url);
    inits.push(init);
    const body = bodies[Math.min(i, bodies.length - 1)];
    i++;
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
  });
  return { fetch: impl as unknown as typeof fetch, urls, inits };
}
