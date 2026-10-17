import {createHash,randomBytes} from 'node:crypto';
const fail=(message,status)=>{throw Object.assign(new Error(message),{status});};
export function parseCookies(header='') {
  const cookies=Object.create(null);
  for(const part of header.split(';')) {
    const at=part.indexOf('=');if(at<1)continue;
    try {cookies[part.slice(0,at).trim()]=decodeURIComponent(part.slice(at+1).trim());} catch {/* Ignore only the malformed cookie. */}
  }
  return cookies;
}
export function readJsonBody(request,maximum=500_000) {
  return new Promise((resolve,reject)=>{
    let bytes=0,oversized=false;const chunks=[];
    request.on('data',chunk=>{bytes+=chunk.length;if(bytes>maximum){oversized=true;chunks.length=0;return;}if(!oversized)chunks.push(Buffer.from(chunk));});
    request.on('end',()=>{
      if(oversized)return reject(Object.assign(new Error('Anfrage zu groß.'),{status:413}));
      try {const text=Buffer.concat(chunks).toString('utf8'),body=text?JSON.parse(text):{};
        if(!body||typeof body!=='object'||Array.isArray(body))return reject(Object.assign(new Error('JSON-Objekt erforderlich.'),{status:400}));
        resolve(body);
      }catch {reject(Object.assign(new Error('Ungültiges JSON.'),{status:400}));}
    });
    request.on('aborted',()=>reject(Object.assign(new Error('Anfrage abgebrochen.'),{status:400})));
    request.on('error',reject);
  });
}
export function createRequestGuard(clock=Date.now) {
  const salt=randomBytes(16),attempts=new Map();let nextCleanup=0;
  return (request,url)=>{
    if(!url.pathname.startsWith('/api/'))return;
    const writes=!['GET','HEAD'].includes(request.method);
    if(writes){
      if(request.headers['sec-fetch-site']==='cross-site')fail('Fremder Ursprung nicht erlaubt.',403);
      if(request.headers.origin){let origin;try{origin=new URL(request.headers.origin);}catch{fail('Ungültiger Ursprung.',403);}
        if(origin.host!==request.headers.host)fail('Fremder Ursprung nicht erlaubt.',403);
      }
      // The existing logout request intentionally has no body or Content-Type.
      if(url.pathname!=='/api/auth/logout'&&!/^application\/json(?:;|$)/i.test(request.headers['content-type']||''))fail('JSON erforderlich.',415);
    }
    if(writes&&['/api/auth/login','/api/auth/register'].includes(url.pathname)){
      const now=clock();if(now>=nextCleanup){for(const [key,value]of attempts)if(value.until<=now)attempts.delete(key);nextCleanup=now+60000;}
      // Only the socket peer is trusted; spoofed forwarded-IP headers cannot evade this limit.
      const key=createHash('sha256').update(salt).update(request.socket.remoteAddress||'unknown').digest('hex');
      let entry=attempts.get(key);if(!entry||entry.until<=now){if(attempts.size>=10000)fail('Anmeldung ausgelastet.',503);entry={count:0,until:now+60000};attempts.set(key,entry);}
      if(++entry.count>60)throw Object.assign(new Error('Zu viele Anmeldeversuche. Bitte kurz warten.'),{status:429,retryAfter:Math.max(1,Math.ceil((entry.until-now)/1000))});
    }
  };
}
