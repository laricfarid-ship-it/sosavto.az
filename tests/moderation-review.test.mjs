import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewListing } from '../server/moderation-review.mjs';

test('clear listing receives low risk and no flags', () => {
  const result = reviewListing({ image_count: 4, duplicate_count: 0, seller_pending_count: 1, price: 12000, reference_price: 11500 });
  assert.equal(result.risk, 'low');
  assert.equal(result.riskLabel, 'Aşkar risk yoxdur');
  assert.deepEqual(result.flags, []);
});

test('listing without images is flagged for manual review', () => {
  const result = reviewListing({ image_count: 0 });
  assert.equal(result.risk, 'medium');
  assert.equal(result.flags[0].code, 'no-images');
});

test('duplicate listing is high risk but not automatically rejected', () => {
  const result = reviewListing({ image_count: 3, duplicate_count: 1, seller_pending_count: 1, price: 12000 });
  assert.equal(result.risk, 'high');
  assert.equal(result.flags.some(flag => flag.code === 'possible-duplicate'), true);
});

test('large pending queue on one account is flagged', () => {
  const result = reviewListing({ image_count: 2, duplicate_count: 0, seller_pending_count: 5 });
  assert.equal(result.risk, 'medium');
  assert.equal(result.flags.some(flag => flag.code === 'many-pending'), true);
});

test('outlier prices are flagged only when a reference median exists', () => {
  assert.equal(reviewListing({ price: 3000, reference_price: 10000 }).flags.some(flag => flag.code === 'price-low'), true);
  assert.equal(reviewListing({ price: 22000, reference_price: 10000 }).flags.some(flag => flag.code === 'price-high'), true);
  assert.deepEqual(reviewListing({ price: 3000, reference_price: 0 }).flags, []);
});

test('missing or malformed metrics fail safely without throwing', () => {
  const result = reviewListing({ image_count: 'bad', duplicate_count: null, seller_pending_count: undefined, price: 'bad', reference_price: 'bad' });
  assert.equal(result.risk, 'medium');
  assert.equal(result.flags.some(flag => flag.code === 'no-images'), true);
});
