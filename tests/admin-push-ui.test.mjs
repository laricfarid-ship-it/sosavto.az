import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=(await readFile(new URL('../assets/admin-push.js',import.meta.url),'utf8')).replaceAll('export async function','async function')+';return {mountAdminPush,disableAdminPush};';
function harness({ios=false,denied=false}={}){
 const dom=new JSDOM('<div id="panel"></div>',{url:'https://sosavto.test/admin.html'}),w=dom.window,calls=[];
 let current=null,permissionCalls=0;const sub={endpoint:'https://fcm.googleapis.com/fcm/send/ui-test',options:{},toJSON(){return {endpoint:this.endpoint,keys:{}};},async unsubscribe(){current=null;return true;}};
 const reg={pushManager:{async getSubscription(){return current;},async subscribe(){current=sub;return sub;}}};
 const nav={userAgent:ios?'iPhone':'Android Chrome',serviceWorker:{async register(){return reg;},ready:Promise.resolve(reg),async getRegistration(){return reg;}}};
 const notification={permission:denied?'denied':'default',requestPermission(){permissionCalls++;this.permission='granted';return Promise.resolve('granted');}};
 Object.defineProperty(w,'isSecureContext',{value:true});w.PushManager=function(){};w.Notification=notification;
 const run=new Function('window','navigator','Notification','atob','setTimeout',source),exports=run(w,nav,notification,atob,()=>0);
 const api=async(path,method='GET',data)=>{calls.push({path,method,data});return {enabled:true,publicKey:'BA'};};
 return {w,root:w.document.querySelector('#panel'),calls,exports,api,permissionCalls:()=>permissionCalls,task:async(_,fn)=>fn(),toast:()=>{},close:()=>w.close()};
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
