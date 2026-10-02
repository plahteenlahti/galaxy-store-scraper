/**
 * Runs every @perttu/galaxy-store-scraper method against the live store
 * Run with: npx tsx examples/all-methods.ts
 */

import { app, reviews, similar } from '../src/index.js';

async function testAllMethods() {
  const appId = process.argv[2] ?? 'studio.happycode.puking_cat';

  console.log(`\n=== app({ appId: '${appId}' }) ===`);
  const details = await app({ appId });
  console.log(JSON.stringify(details, null, 2));

  console.log(`\n=== app({ appId: '${appId}', country: 'fi' }) ===`);
  const finnish = await app({ appId, country: 'fi' });
  console.log({
    country: finnish.country,
    priceText: finnish.priceText,
    dataSafety: finnish.dataSafety,
  });

  console.log(`\n=== reviews({ id: '${details.id}' }) ===`);
  const latest = await reviews({ id: details.id });
  console.log(`${latest.length} reviews`, latest.slice(0, 3));

  console.log(`\n=== similar({ appId: '${appId}' }) ===`);
  const related = await similar({ appId });
  console.log(related.map((r) => `${r.title} (${r.appId}) ★${r.score}`));
}

testAllMethods().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
