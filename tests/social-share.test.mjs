import test from 'node:test';
import assert from 'node:assert/strict';
import {socialSharePreview} from '../server/social-share.mjs';

test('approved listing yields social preview, not publication', () => {
 const p=socialSharePreview({id:'123',title:'Hyundai Elantra',price:20000,city:'Bakı',status:'active'},'https://example.com/car.webp');
 assert.equal(p.published,false);
 assert.deepEqual(p.platforms,['instagram','facebook']);
 assert.match(p.caption,/Hyundai Elantra/);
 assert.match(p.caption,/sosavto.az/);
 assert.equal(p.imageUrl,'https://example.com/car.webp');
});
test('pending and rejected listings cannot be previewed', () => {
 for(const status of ['pending','rejected']) assert.throws(()=>socialSharePreview({id:'123',status}),/LISTING_NOT_ACTIVE/);
});
