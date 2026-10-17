import {mkdir,open,rename,rm} from 'node:fs/promises';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';

// Never truncate the last usable save. A failed write must not poison later saves.
export function atomicJsonWriter(destination, io={mkdir,open,rename,rm}) {
  let pending=Promise.resolve();
  return function writeSnapshot(value) {
    const contents=JSON.stringify(value,null,2);
    const result=pending.then(async()=>{
      await io.mkdir(dirname(destination),{recursive:true});
      const temporary=destination+'.'+randomUUID()+'.tmp';
      try {
        const file=await io.open(temporary,'wx',0o600);
        try {await file.writeFile(contents,'utf8');await file.sync();} finally {await file.close();}
        await io.rename(temporary,destination);
      } finally {await io.rm(temporary,{force:true});}
    });
    pending=result.catch(()=>{});
    return result;
  };
}
