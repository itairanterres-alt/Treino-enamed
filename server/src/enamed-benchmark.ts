type QuestionLike={stem:string;alternatives:Array<{text:string}>};

const words=(value:string)=>value.trim().split(/\s+/u).filter(Boolean).length;

export type EnamedBenchmark={
 stem_words:number;
 total_words:number;
 alternative_words:number[];
 issues:string[];
 reference:string;
};

/**
 * Envelope observed in the 90 valid items of ENAMED 2025, caderno 1.
 * It is a format gate, not a medical-validity score and not a claim that every
 * future official item must stay inside these limits.
 */
export function benchmarkAgainstEnamed2025(question:QuestionLike):EnamedBenchmark{
 const stemWords=words(question.stem);
 const alternativeWords=question.alternatives.map(({text})=>words(text));
 const totalWords=stemWords+alternativeWords.reduce((sum,count)=>sum+count,0);
 const issues:string[]=[];
 if(stemWords<32)issues.push(`Enunciado com ${stemWords} palavras; referência oficial observada: 32–243.`);
 if(stemWords>243)issues.push(`Enunciado com ${stemWords} palavras; referência oficial observada: 32–243.`);
 if(totalWords<49)issues.push(`Item com ${totalWords} palavras; referência oficial observada: 49–292.`);
 if(totalWords>292)issues.push(`Item com ${totalWords} palavras; referência oficial observada: 49–292.`);
 alternativeWords.forEach((count,index)=>{if(count>48)issues.push(`Alternativa ${String.fromCharCode(65+index)} com ${count} palavras; máximo observado: 48.`)});
 return{stem_words:stemWords,total_words:totalWords,alternative_words:alternativeWords,issues,reference:'ENAMED 2025 — caderno 1, 90 itens válidos'};
}
