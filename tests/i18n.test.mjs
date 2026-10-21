import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

test('language selector translates interface, keeps listing title original, and translates select options', async () => {
  const dom = new JSDOM(`<!doctype html><html lang="az"><body>
    <select id="site-language"><option value="az">AZ</option><option value="en">EN</option><option value="ru">RU</option></select>
    <nav><a>Elanlar</a></nav>
    <h3 class="break">Elanlar</h3>
    <label><span>Qiymət</span><select><option value="">Hamısı</option><option value="car">Avtomobillər</option></select></label>
  </body></html>`, { url: 'https://example.test' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.MutationObserver = dom.window.MutationObserver;
  globalThis.localStorage = dom.window.localStorage;
  const { initLanguage } = await import('../assets/i18n.js');
  initLanguage();
  const picker = document.querySelector('#site-language');
  picker.value = 'en';
  picker.dispatchEvent(new dom.window.Event('change'));
  assert.equal(document.documentElement.lang, 'en');
  assert.equal(document.querySelector('nav a').textContent.trim(), 'Listings');
  assert.equal(document.querySelector('h3.break').textContent.trim(), 'Elanlar');
  assert.equal(document.querySelector('label span').textContent.trim(), 'Price');
  assert.equal(document.querySelector('label select option[value=""]').textContent.trim(), 'All');
  assert.equal(document.querySelector('label select option[value="car"]').textContent.trim(), 'Cars');
  assert.equal(localStorage.getItem('sosavto-language'), 'en');
  picker.value = 'ru';
  picker.dispatchEvent(new dom.window.Event('change'));
  assert.equal(document.documentElement.lang, 'ru');
  assert.equal(document.querySelector('nav a').textContent.trim(), 'Объявления');
  assert.equal(document.querySelector('h3.break').textContent.trim(), 'Elanlar');
  assert.equal(localStorage.getItem('sosavto-language'), 'ru');
  dom.window.close();
});
