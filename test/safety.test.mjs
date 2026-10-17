import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,readFile,readdir,rename,mkdir,open,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PassThrough} from 'node:stream';
import {atomicJsonWriter} from '../storage.mjs';
import {parseCookies,readJsonBody,createRequestGuard} from '../request-safety.mjs';

test('atomic saves survive a failed replacement and later saves recover',async()=>{
  const dir=await mkdtemp(join(process.env.ORBITAL_TEST_ROOT || tmpdir(),'orbital-storage-')),file=join(dir,'accounts.json');let failRename=false;
  const writer=atomicJsonWriter(file,{mkdir,open,rm,rename:async(...args)=>{if(failRename)throw new Error('simulated disk failure');return rename(...args);}});
  try {
    await writer({accounts:{existing:{score:1}}});failRename=true;
    await assert.rejects(writer({accounts:{existing:{score:2}}}));
    assert.equal(JSON.parse(await readFile(file)).accounts.existing.score,1);
    failRename=false;await writer({accounts:{existing:{score:3}}});
    assert.equal(JSON.parse(await readFile(file)).accounts.existing.score,3);
    assert.deepEqual(await readdir(dir),['accounts.json']);
    const snapshot={value:4},a=writer(snapshot);snapshot.value=99;const b=writer({value:5});await Promise.all([a,b]);
    assert.equal(JSON.parse(await readFile(file)).value,5);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('malformed unrelated cookies do not break a valid session',()=>{
  const cookies=parseCookies('bad=%E0%A4%A; of_session=valid; __proto__=safe');
  assert.equal(cookies.of_session,'valid');assert.equal(cookies.bad,undefined);assert.equal(Object.getPrototypeOf(cookies),null);
});
function body(text,max){const stream=new PassThrough(),promise=readJsonBody(stream,max);stream.end(text);return promise;}
test('JSON errors are client errors and payload limits count UTF-8 bytes',async()=>{
  assert.deepEqual(await body('{"ok":true}'),{ok:true});
  for(const value of ['{','null','[]','42'])await assert.rejects(body(value),{status:400});
  await assert.rejects(body('{"x":"öööö"}',12),{status:413});
  assert.deepEqual(await body(''),{});
});
const request=(headers={},method='POST')=>({method,headers:{host:'game.invalid','content-type':'application/json',...headers},socket:{remoteAddress:'127.0.0.1'}});
test('cross-site writes rejected; logout without JSON and reads still work',()=>{
  const guard=createRequestGuard(),url=new URL('https://game.invalid/api/state');
  assert.throws(()=>guard(request({origin:'https://evil.invalid'}),url),{status:403});
  assert.throws(()=>guard(request({'sec-fetch-site':'cross-site'}),url),{status:403});
  assert.throws(()=>guard(request({'content-type':'text/plain'}),url),{status:415});
  assert.doesNotThrow(()=>guard(request({origin:'https://game.invalid'}),url));
  assert.doesNotThrow(()=>guard(request({'content-type':''}),new URL('https://game.invalid/api/auth/logout')));
  assert.doesNotThrow(()=>guard(request({},'GET'),url));
});
test('login throttling ignores spoofed forwarded IPs and recovers after the window',()=>{
  let now=0;const guard=createRequestGuard(()=>now),url=new URL('https://game.invalid/api/auth/login');
  for(let i=0;i<60;i++)guard(request({'x-forwarded-for':`fake-${i}`}),url);
  assert.throws(()=>guard(request({'x-forwarded-for':'another-fake'}),url),{status:429,retryAfter:60});
  now=60001;assert.doesNotThrow(()=>guard(request(),url));
});
