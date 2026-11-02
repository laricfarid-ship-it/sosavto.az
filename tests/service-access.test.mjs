import test from 'node:test';
import assert from 'node:assert/strict';
import {founderServiceAccess,serviceAccess} from '../server/service-access.mjs';
import {safeUser} from '../server/security.mjs';
import {sos} from '../server/sos.mjs';
import {wash} from '../server/wash.mjs';
const founder={id:'ab3510c3-8458-4a38-96c2-64b5fcb9157e',role:'admin',status:'active'};
test('only the verified active founder gets the server-issued preview capability',()=>{
 assert.equal(founderServiceAccess(founder),true);assert.equal(safeUser(founder).servicePreview,true);
 for(const u of [null,{...founder,id:'other-admin'},{...founder,role:'user'},{...founder,status:'banned'},{...founder,id:'other',username:'ffariidd114',fullname:'Farid Aliyev',servicePreview:true}]){
 assert.equal(founderServiceAccess(u),false);assert.equal(serviceAccess(u,{}),false);if(u)assert.equal(safeUser(u).servicePreview,false);
 }
 assert.equal(serviceAccess(null,{LOCAL_DATABASE:'true',VERCEL:'1'}),false);
 assert.equal(serviceAccess(null,{LOCAL_DATABASE:'true',NODE_ENV:'production'}),false);
});
test('service endpoints deny guests and other admins before querying any data',async()=>{
 delete process.env.LOCAL_DATABASE;process.env.SOS_ENABLED='true';process.env.WASH_ENABLED='true';
 for(const fn of [sos,wash])for(const user of [null,{...founder,id:'other-admin'}, {...founder,role:'user'}, {...founder,status:'banned'}])for(const method of ['GET','POST']){
 await assert.rejects(fn({url:'/api/'+(fn===sos?'sos/requests':'wash/shops')},user,'/unused',method),e=>e.status===404&&/təmir/.test(e.message));
 }
});
