import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {initI18n,setLanguage,getLanguage} from '../assets/i18n.js';

test('site language switches AZ/EN/RU, persists choice, and leaves user listing text unchanged',()=>{
  const dom=new JSDOM('<!doctype html><html lang="az"><body><header><nav class="nav-actions"><a>Elanlar</a><button class="theme-toggle">Tema</button></nav></header><main><p>Servis xəritəsi</p><article class="card"><h3 class="break">Aktiv</h3><p class="description">Elanlar</p></article></main></body></html>',{url:'https://sosavto.test/'});
  const w=dom.window;
  const previous={document:globalThis.document,window:globalThis.window,localStorage:globalThis.localStorage,NodeFilter:globalThis.NodeFilter,Node:globalThis.Node,MutationObserver:globalThis.MutationObserver,CustomEvent:globalThis.CustomEvent};
  Object.assign(globalThis,{document:w.document,window:w,localStorage:w.localStorage,NodeFilter:w.NodeFilter,Node:w.Node,MutationObserver:w.MutationObserver,CustomEvent:w.CustomEvent});
  try{
    initI18n();
    setLanguage('en');
    assert.equal(w.document.querySelector('nav a').textContent,'Listings');
    assert.equal(w.document.querySelector('main > p').textContent,'Service map');
    assert.equal(w.document.querySelector('.card h3').textContent,'Aktiv');
    assert.equal(w.document.querySelector('.description').textContent,'Elanlar');
    assert.equal(w.localStorage.getItem('sosavto_language'),'en');
    setLanguage('ru');
    assert.equal(w.document.querySelector('nav a').textContent,'Объявления');
    assert.equal(w.document.querySelector('main > p').textContent,'Карта сервисов');
    assert.equal(w.document.querySelector('.card h3').textContent,'Aktiv');
    setLanguage('az');
    assert.equal(w.document.querySelector('nav a').textContent,'Elanlar');
    assert.equal(w.document.querySelector('main > p').textContent,'Servis xəritəsi');
    assert.equal(getLanguage(),'az');
  } finally {
    for(const [key,value] of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
    dom.window.close();
  }
});
