import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFile} from 'node:fs/promises';
import {mountMessages} from '../assets/messages.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const source=await readFile(new URL('../assets/app.js',import.meta.url),'utf8');
const auth=source.slice(source.indexOf('async function auth(register=false){'),source.indexOf('async function passwordRecovery(){'));
const input=(name,label,type,placeholder,extra='')=>`<label>${label}<input name="${name}" type="${type}" ${extra}></label>`;
test('login uses separate business mode, retains next and challenges admin without a password replay',async()=>{
 for(const mode of ['','account=business&next=%2Fmesajlar.html']){
 const dom=new JSDOM('<main></main>'),d=dom.window.document,calls=[],location={};
 const run=new Function('main','$','params','input','api','location','document',auth+';return auth(false);');
 await run(d.querySelector('main'),s=>d.querySelector(s),new URLSearchParams(mode),input,async(...args)=>{calls.push(args);return {requires2fa:true};},location,d);
 assert.equal(d.querySelector('.auth-emblem').getAttribute('src'),'assets/brand-sa.svg');const form=d.querySelector('#auth');assert.equal(form.elements.login_mode.value,mode?'business':'individual');assert.ok(d.querySelector('.business-login-card a'));
 if(mode)assert.match(d.querySelector('.business-login-card a').href,/next=%2Fmesajlar.html/);
 form.elements.identifier.value='test';form.elements.password.value='Strong-password-123';const SavedFormData=globalThis.FormData;globalThis.FormData=dom.window.FormData;try{await form.onsubmit({preventDefault(){},target:form});}finally{globalThis.FormData=SavedFormData;}
 assert.equal(calls[0][2].login_mode,mode?'business':'individual');assert.equal(form.elements.password.value,'');assert.equal(form.elements.password.disabled,true);assert.ok(form.elements.totp);dom.window.close();
 }
});
test('message UI escapes content, saves via API, restores history and opens support',async()=>{
 const dom=new JSDOM('<main></main>',{url:'https://example.test/mesajlar.html'}),d=dom.window.document,main=d.querySelector('main'),calls=[];
 const original={window:globalThis.window,document:globalThis.document};globalThis.window=dom.window;globalThis.document=d;
 let rows=[{id:'m1',sender_id:'seller',body:'<img src=x onerror=alert(1)>',created_at:'2026-11-16 10:00:00.123456+00'}],support=false;
 const api=async(path,method,data)=>{calls.push([path,method,data]);if(path==='/conversations'&&method==='POST'){support=true;return {conversation:{id:'support'}};}if(path==='/conversations')return {conversations:[{id:'thread',name:'Seller',title:'BMW',listing_id:'listing',kind:'listing'},...(support?[{id:'support',name:'SosAvto dəstək',kind:'support'}]:[])]};if(method==='POST'){rows.push({id:'m2',sender_id:'buyer',body:data.message,created_at:'2026-11-16 10:00:01+00'});return {message:rows.at(-1)};}return {messages:rows,hasMore:false};};
 try{await mountMessages({main,me:{id:'buyer'},api,esc,sidebar:()=>'',wireLogout(){},params:new URLSearchParams()});assert.equal(main.querySelector('#message-history img'),null);assert.match(main.querySelector('#message-history').textContent,/<img/);const form=main.querySelector('form');form.elements.message.value='Salam';await form.onsubmit({preventDefault(){},target:form});assert.match(main.querySelector('#message-history').textContent,/Salam/);assert.ok(calls.some(c=>c[0]==='/conversations/thread/messages'&&c[1]==='POST'));await main.querySelector('#contact-support').onclick();assert.equal(main.querySelector('#conversation-heading').textContent,'SosAvto dəstək');assert.match(dom.window.location.search,/conversation=support/);}finally{dom.window.dispatchEvent(new dom.window.Event('pagehide'));dom.window.close();globalThis.window=original.window;globalThis.document=original.document;}
});
