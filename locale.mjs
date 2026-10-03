import {readFile} from "node:fs/promises";
import {isIP} from "node:net";
const data = await readFile(new URL("./country-data.json",import.meta.url),"utf8").then(JSON.parse).catch(()=>({ipv4:[],ipv6:[]}));
function ipNumber(address) {
  if (isIP(address) === 4) return address.split(".").reduce((value,part)=>(value<<8n)+BigInt(part),0n);
  if (isIP(address) !== 6) return null;
  if (address.includes(".")) {
    const last=address.lastIndexOf(":");
    const v4=ipNumber(address.slice(last+1));
    address=address.slice(0,last)+":"+(v4>>16n).toString(16)+":"+(v4&65535n).toString(16);
  }
  const halves=address.split("::");
  const left=halves[0]?halves[0].split(":"):[];
  const right=halves[1]?halves[1].split(":"):[];
  const parts=halves.length===2?[...left,...Array(8-left.length-right.length).fill("0"),...right]:left;
  return parts.reduce((value,part)=>(value<<16n)+BigInt("0x"+(part||"0")),0n);
}
const ranges={4:data.ipv4.map(([a,b,c])=>[ipNumber(a),ipNumber(b),c]),6:data.ipv6.map(([a,b,c])=>[ipNumber(a),ipNumber(b),c])};
export function countryForAddress(address) {
  address=String(address||"").replace(/^::ffff:/i,"");
  const version=isIP(address), value=ipNumber(address), list=ranges[version];
  if(value===null||!list)return null;
  let low=0,high=list.length-1;
  while(low<=high){const mid=(low+high)>>1;const [a,b,c]=list[mid];if(value<a)high=mid-1;else if(value>b)low=mid+1;else return c;}
  return null;
}
export function requestLocale(request) {
  const forwarded=process.env.RENDER ? String(request.headers["cf-connecting-ip"] || request.headers["x-forwarded-for"] || "").split(",")[0].trim() : "";
  const address=(forwarded||request.socket.remoteAddress||"").replace(/^::ffff:/i,"");
  const country=countryForAddress(address);
  const privateAddress=!isIP(address)||/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|::1$|f[cd]|fe80:)/i.test(address);
  const fallback=String(request.headers["accept-language"]||"de").split(",")[0].trim().toLowerCase().startsWith("de")?"de":"en";
  return {language:country?"de":privateAddress?fallback:"en",country:country||null,source:privateAddress?"browser":"ip"};
}
