import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=(await readFile(new URL('../assets/admin-push.js',import.meta.url),'utf8')).replaceAll('export async function','async function')+';return {mountAdminPush,disableAdminPush};';
function harness({ios=false,denied=false,failures=0,pushError="AbortError",existingKey=null,offline=false,saveFails=false}={}){
 const dom=new JSDOM('<div id="panel"></div>',{url:'https://sosavto.test/admin.html'}),w=dom.window,calls=[];
 let current=null,permissionCalls=0,subscribeCalls=0,unsubscribes=0;const sub={endpoint:'https://fcm.googleapis.com/fcm/send/ui-test',options:{},toJSON(){return {endpoint:this.endpoint,keys:{}};},async unsubscribe(){unsubscribes++;current=null;return true;}};
 if(existingKey){current=sub;sub.options.applicationServerKey=Uint8Array.from(existingKey).buffer;}
 const reg={pushManager:{async getSubscription(){return current;},async subscribe(){subscribeCalls++;if(subscribeCalls<=failures)throw Object.assign(Error('Registration failed - push service error'),{name:pushError});current=sub;return sub;}}};
 const nav={onLine:!offline,userAgent:ios?'iPhone':'Android Chrome',serviceWorker:{async register(){return reg;},ready:Promise.resolve(reg),async getRegistration(){return reg;}}};
 const notification={permission:denied?'denied':'default',requestPermission(){permissionCalls++;this.permission='granted';return Promise.resolve('granted');}};
 Object.defineProperty(w,'isSecureContext',{value:true});w.PushManager=function(){};w.Notification=notification;
 const run=new Function('window','navigator','Notification','atob','setTimeout',source),exports=run(w,nav,notification,atob,(fn,ms)=>{if(ms<12000)queueMicrotask(fn);return 0;});
 const api=async(path,method='GET',data)=>{calls.push({path,method,data});if(saveFails&&method==='POST')throw Error('Server bağlantısı alınmadı.');return {enabled:true,publicKey:'BA'};};
 return {w,root:w.document.querySelector('#panel'),calls,exports,api,permissionCalls:()=>permissionCalls,subscribeCalls:()=>subscribeCalls,unsubscribes:()=>unsubscribes,task:async(_,fn)=>fn(),toast:()=>{},close:()=>w.close()};
}
test('push activation requires a tap and test delivery targets this phone; disabling unregisters',async()=>{
 const h=harness();try{await h.exports.mountAdminPush(h.root,h);assert.equal(h.permissionCalls(),0);const enable=h.root.querySelector('[data-push-enable]');assert.equal(enable.hidden,false);await enable.onclick();assert.equal(h.permissionCalls(),1);assert.equal(enable.hidden,true);assert.ok(h.calls.some(c=>c.method==='POST'));await h.root.querySelector('[data-push-test]').onclick();assert.equal(h.calls.at(-1).method,'PUT');assert.match(h.calls.at(-1).data.endpoint,/ui-test$/);await h.root.querySelector('[data-push-disable]').onclick();assert.equal(h.calls.at(-1).method,'DELETE');assert.equal(enable.hidden,false);}finally{h.close();}
});
test('iPhone installation instructions and denied permission never trigger a prompt',async()=>{for(const options of [{ios:true},{denied:true}]){const h=harness(options);try{await h.exports.mountAdminPush(h.root,h);assert.equal(h.permissionCalls(),0);assert.equal(h.root.querySelector('[data-push-enable]').hidden,true);assert.match(h.root.textContent,options.ios?/Ana ekrana əlavə et/:/bloklanıb/);}finally{h.close();}}});
test('service worker always displays push and restricts clicks to the local admin page',async()=>{
 const events={},shown=[],opened=[];const context={URL,self:{location:{origin:'https://sosavto.test'},addEventListener:(type,fn)=>events[type]=fn,registration:{showNotification:async(title,options)=>shown.push({title,options})},clients:{matchAll:async()=>[],openWindow:async url=>opened.push(url)}}};
 vm.runInNewContext(await readFile(new URL('../sw.js',import.meta.url),'utf8'),context);
 let wait;events.push({data:{json:()=>({title:'Yeni elan',url:'https://evil.test'})},waitUntil:p=>wait=p});await wait;assert.equal(shown[0].options.data.url,'/admin.html');
 events.notificationclick({notification:{data:{url:'/admin.html?listing=test'},close(){}},waitUntil:p=>wait=p});await wait;assert.equal(opened[0],'https://sosavto.test/admin.html?listing=test');
});

test('temporary Chrome push errors recover before the subscription is saved',async()=>{
 const h=harness({failures:2});try{await h.exports.mountAdminPush(h.root,h);await h.root.querySelector('[data-push-enable]').onclick();assert.equal(h.subscribeCalls(),3);assert.equal(h.calls.filter(c=>c.method==='POST').length,1);assert.match(h.root.querySelector('[data-push-status]').textContent,/aktivdir/);}finally{h.close();}
});
test('persistent push failure stays visible with a working retry button and never reports active',async()=>{
 const h=harness({failures:3});try{await h.exports.mountAdminPush(h.root,h);const button=h.root.querySelector('[data-push-enable]');await button.onclick();assert.equal(h.subscribeCalls(),3);assert.equal(button.hidden,false);assert.equal(button.textContent,'Yenidən cəhd et');assert.match(h.root.querySelector('[data-push-status]').textContent,/Chrome.*qoşula bilmədi/);assert.equal(h.root.querySelector('[data-push-test]').hidden,true);assert.equal(h.calls.filter(c=>c.method==='POST').length,0);await button.onclick();assert.equal(h.subscribeCalls(),4);assert.equal(button.hidden,true);}finally{h.close();}
});
test('outdated keys including a longer key are renewed only after a tap',async()=>{
 const h=harness({existingKey:[4,1]});try{await h.exports.mountAdminPush(h.root,h);assert.equal(h.unsubscribes(),0);assert.equal(h.calls.filter(c=>c.method==='POST').length,0);await h.root.querySelector('[data-push-enable]').onclick();assert.equal(h.unsubscribes(),1);assert.equal(h.subscribeCalls(),1);assert.equal(h.calls.filter(c=>c.method==='POST').length,1);}finally{h.close();}
});
test('permission errors do not retry and offline activation never contacts the push service',async()=>{
 for(const options of [{failures:9,pushError:'NotAllowedError'},{offline:true}]){const h=harness(options);try{await h.exports.mountAdminPush(h.root,h);await h.root.querySelector('[data-push-enable]').onclick();assert.equal(h.subscribeCalls(),options.offline?0:1);assert.match(h.root.querySelector('[data-push-status]').textContent,options.offline?/İnternet bağlantısı yoxdur/:/icazəsi bloklanıb/);assert.equal(h.root.querySelector('[data-push-enable]').hidden,false);}finally{h.close();}}
});
test('server save failure never reports activation and retries reuse the existing subscription',async()=>{
 const h=harness({saveFails:true});try{await h.exports.mountAdminPush(h.root,h);const button=h.root.querySelector('[data-push-enable]');await button.onclick();assert.equal(button.hidden,false);assert.match(h.root.querySelector('[data-push-status]').textContent,/Server bağlantısı/);await button.onclick();assert.equal(h.subscribeCalls(),1);assert.equal(h.calls.filter(c=>c.method==='POST').length,2);}finally{h.close();}
});
