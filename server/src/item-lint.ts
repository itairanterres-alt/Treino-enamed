type Item={stem:string;correct:'A'|'B'|'C'|'D';alternatives:Array<{id:'A'|'B'|'C'|'D';text:string}>};
export type ItemLint={repair_issues:string[];warnings:string[];metrics:{alternative_words:Record<string,number>;alternative_actions:Record<string,number>;correct_to_distractor_mean:number}};

const words=(text:string)=>text.toLocaleLowerCase('pt-BR').match(/[\p{L}\p{N}]+/gu)||[];
const normalized=(text:string)=>new Set(words(text).filter(word=>word.length>2));
const similarity=(a:string,b:string)=>{const aa=normalized(a),bb=normalized(b);const intersection=[...aa].filter(x=>bb.has(x)).length;const union=new Set([...aa,...bb]).size;return union?intersection/union:0};
const actionCount=(text:string)=>(text.match(/\b(?:administrar|aguardar|controlar|encaminhar|indicar|iniciar|internar|manter|prescrever|providenciar|realizar|repetir|solicitar|suspender|tratar)\b/giu)||[]).length;

export function lintItem(item:Item):ItemLint{
 const repair_issues:string[]=[];const warnings:string[]=[];const combined=[item.stem,...item.alternatives.map(a=>a.text)].join(' ');
 if(/(?:exceto|incorreta?|falsa?|n[aã]o\s+(?:é|está|deve|corresponde))/iu.test(item.stem))repair_issues.push('Enunciado negativo ou de exceção; reescrever como pergunta afirmativa.');
 if(/\b(?:assinale|marque|selecione|indique|aponte)\b/iu.test(item.stem))repair_issues.push('Enunciado usa verbo de instrução; formular pergunta direta.');
 if(/\b(?:todas|nenhuma)\s+(?:as|das)\s+anteriores\b/iu.test(combined))repair_issues.push('Alternativa do tipo todas/nenhuma das anteriores.');
 for(let i=0;i<item.alternatives.length;i++)for(let j=i+1;j<item.alternatives.length;j++)if(similarity(item.alternatives[i].text,item.alternatives[j].text)>=.85)repair_issues.push(`Alternativas ${item.alternatives[i].id} e ${item.alternatives[j].id} são duplicadas ou quase duplicadas.`);
 item.alternatives.forEach(a=>{if(/\b(?:porque|pois|uma vez que|visto que)\b/iu.test(a.text))repair_issues.push(`Alternativa ${a.id} contém explicação causal; mover a justificativa para rationale.`)});
 const counts=Object.fromEntries(item.alternatives.map(a=>[a.id,words(a.text).length]));const correct=counts[item.correct];const distractors=item.alternatives.filter(a=>a.id!==item.correct).map(a=>counts[a.id]);const mean=distractors.reduce((sum,n)=>sum+n,0)/distractors.length;const ratio=mean?correct/mean:0;
 if(correct>=mean*1.8&&correct-mean>=4)repair_issues.push('A alternativa correta é muito mais longa que os distratores e cria pista visual.');
 const actions=Object.fromEntries(item.alternatives.map(a=>[a.id,actionCount(a.text)]));const correctActions=actions[item.correct];const distractorActions=item.alternatives.filter(a=>a.id!==item.correct).map(a=>actions[a.id]);
 if(correctActions>=3&&correctActions>Math.max(...distractorActions))repair_issues.push('A alternativa correta reúne mais ações que todos os distratores e pode ser escolhida por completude formal.');
 if(/\b(?:sempre|nunca|todos|nenhum)\b/iu.test(combined))warnings.push('Há termo absoluto; confirmar se é cientificamente sustentável no contexto.');
 if(/\b(?:pode|podem|geralmente|frequentemente|tipicamente)\b/iu.test(combined))warnings.push('Há linguagem probabilística; revisar no contexto, sem bloqueio automático.');
 return{repair_issues:[...new Set(repair_issues)],warnings:[...new Set(warnings)],metrics:{alternative_words:counts,alternative_actions:actions,correct_to_distractor_mean:Number(ratio.toFixed(2))}};
}
