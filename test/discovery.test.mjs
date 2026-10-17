import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {preferredLanguage} from '../public/i18n.js';
test('explicit English and German campaign links override device defaults safely',()=>{
  assert.equal(preferredLanguage('?lang=en','de'),'en');assert.equal(preferredLanguage('?lang=de','en'),'de');
  assert.equal(preferredLanguage('?lang=invalid','en'),'en');assert.equal(preferredLanguage('','invalid'),null);
});
test('search and sharing pages use real links, artwork and clear alpha/demo disclosures',async()=>{
  const html=await readFile(new URL('../public/discover.html',import.meta.url),'utf8');
  assert.match(html,/<html lang="en">/);assert.match(html,/EARLY ALPHA/);assert.match(html,/read-only/);assert.match(html,/free account is needed to play/i);
  assert.match(html,/property="og:image"/);assert.match(html,/name="description"/);assert.match(html,/<link rel="canonical"/);
  for(const [,path]of html.matchAll(/(?:href|src)="(\/[^"?#]*)/g))if(path!=='/'&&path!=='/demo')await readFile(new URL('../public'+path,import.meta.url));
  const robots=await readFile(new URL('../public/robots.txt',import.meta.url),'utf8');assert.match(robots,/Disallow: \/api\//);assert.match(robots,/sitemap.xml/);
  const sitemap=await readFile(new URL('../public/sitemap.xml',import.meta.url),'utf8');assert.match(sitemap,/discover.html/);
});
test('inviting friends never posts automatically and copies only a public link',async()=>{
  let click;const writes=[],status={textContent:''},button={parentElement:{querySelector:()=>status},addEventListener:(event,handler)=>{click=handler;}};
  const source=await readFile(new URL('../public/promo.js',import.meta.url),'utf8');
  const context={URL,location:{origin:'https://game.example'},document:{documentElement:{lang:'en'},querySelectorAll:()=>[button],querySelector:()=>status},navigator:{clipboard:{writeText:async value=>writes.push(value)}}};
  vm.runInNewContext(source,context);assert.equal(writes.length,0);
  await click();assert.equal(writes.length,1);const shared=new URL(writes[0]);assert.equal(shared.pathname,'/discover.html');assert.equal(shared.searchParams.get('utm_source'),'player');assert.equal(status.textContent,'Invite link copied.');assert.equal(button.disabled,false);
  context.navigator.share=async()=>{throw Object.assign(Error('cancelled'),{name:'AbortError'});};await click();assert.equal(writes.length,1,'cancel does not silently copy or publish');
});
