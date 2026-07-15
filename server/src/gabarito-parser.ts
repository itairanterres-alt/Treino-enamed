export type OfficialKeyStatus='valid'|'annulled'|'excluded'|'administratively_annulled';
export type OfficialKeyItem={number:number;answer:'A'|'B'|'C'|'D'|null;status:OfficialKeyStatus};

export function parseOfficialKey(text:string):OfficialKeyItem[]{
 const found=new Map<number,OfficialKeyItem>();
 const pattern=/(?:^|\s)(\d{1,3})\s+(A|B|C|D|Anulada|Excluída\*?)(?=\s|$)/gim;
 for(const match of text.matchAll(pattern)){const number=Number(match[1]);if(number<1||number>200)continue;const raw=match[2].toLowerCase();found.set(number,{number,answer:/^[a-d]$/.test(raw)?raw.toUpperCase() as 'A'|'B'|'C'|'D':null,status:raw.startsWith('excluída')?'excluded':raw==='anulada'?'annulled':'valid'})}
 if(/\b10\s+Anulada\s+Administrati-?\s*vamente\*\*/i.test(text.replace(/\r?\n/g,' ')))found.set(10,{number:10,answer:null,status:'administratively_annulled'});
 return [...found.values()].sort((a,b)=>a.number-b.number);
}
