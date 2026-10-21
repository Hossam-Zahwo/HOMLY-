import {readWorkbook} from './read-workbook';
self.onmessage=async(e:MessageEvent<ArrayBuffer>)=>{try{const parsed=await readWorkbook(e.data);self.postMessage({ok:true,...parsed})}catch(e){self.postMessage({ok:false,error:(e as Error).message})}};
