import test from 'node:test';
import assert from 'node:assert/strict';
import {listingInput} from '../server/listings.mjs';
import {groupMapListings} from '../assets/service-map.js';
const part={category:'parts',title:'Mağaza detalı',description:'Ehtiyat hissəsi haqqında məlumat',price:10,city:'Bakı',phone:'+994501234567',imageIds:[]};
test('parts map visibility requires explicit boolean consent and complete location',()=>{
 assert.equal(JSON.parse(listingInput(part).details).map_visible,false);
 assert.equal(JSON.parse(listingInput({...part,details:{map_visible:'true'}}).details).map_visible,false);
 assert.throws(()=>listingInput({...part,details:{map_visible:true}}));
 assert.equal(JSON.parse(listingInput({...part,address:'Test küçəsi',latitude:40.4,longitude:49.8,details:{map_visible:true}}).details).map_visible,true);
});
test('map groups one owner at one address and never combines different owners',()=>{
 const base={category:'service',user_id:'one',latitude:40.4,longitude:49.8,address:'Test küçəsi'};
 const grouped=groupMapListings([{...base,id:'a'},{...base,id:'b'},{...base,id:'c',user_id:'two'},{...base,id:'d',latitude:null}]);
 assert.equal(grouped.length,2);assert.equal(grouped[0].listings.length,2);
});
