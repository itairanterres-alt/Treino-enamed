import { assertBudget,recordEstimatedCost } from './budget.js';
import { blueprintSchema,generatedQuestionSchema,reviewSchema } from './schema.js';
import { providers,type ModelProvider,type ProviderResult } from './providers.js';
const json=(text:string)=>JSON.parse(text.replace(/^```json\s*/,'').replace(/```\s*$/,''));
const cost=(r:ProviderResult)=>recordEstimatedCost(r.usage.provider,r.usage.inputTokens,r.usage.outputTokens);
type Provenance={step:string;cycle:number;provider:string;model:string;cost:number};
type Pair={generator:ModelProvider;reviewer:ModelProvider};

export async function runPipeline(input:unknown,pair:Pair=providers()){
 assertBudget();const blueprint=blueprintSchema.parse(input);const maxCycles=Math.max(0,Math.min(3,Number(process.env.AI_MAX_REPAIR_CYCLES||2)));const provenance:Provenance[]=[];
 const generated=await pair.generator.generate('Construa uma questão inédita de treino médico. Responda apenas JSON válido, com quatro alternativas ABDC e uma correta. Não alegue revisão humana.',`Blueprint: ${JSON.stringify(blueprint)}. Produza area, topic, stem, alternatives[{id,text,rationale}], correct, pearl, source e source_claim.`);provenance.push({step:'generate',cycle:0,provider:generated.usage.provider,model:generated.usage.model,cost:cost(generated)});let question=generatedQuestionSchema.parse(json(generated.text));
 for(let cycle=0;cycle<=maxCycles;cycle++){
  assertBudget();const blinded={...question,correct:undefined,pearl:undefined,alternatives:question.alternatives.map(({rationale,...a})=>a)};const reviewed=await pair.reviewer.generate('Resolva e critique sem confiar no gabarito do autor. Responda somente JSON.',`Questão cega: ${JSON.stringify(blinded)}. Produza chosen_answer (A/B/C/D/NONE/AMBIGUOUS), safe, blocking_issues[], quality_issues[], source_needs_check e recommendation (approve/repair/block).`);provenance.push({step:'blind_review',cycle,provider:reviewed.usage.provider,model:reviewed.usage.model,cost:cost(reviewed)});const review=reviewSchema.parse(json(reviewed.text));const agrees=review.chosen_answer===question.correct;
  if(review.safe&&agrees&&review.recommendation==='approve')return{question,status:'auto_verified',review,cycles:cycle,source_status:'unverified',provenance,disclaimer:'Verificação automática não equivale a revisão por especialista. A fonte ainda precisa de confirmação documental.'};
  if(review.recommendation==='block'||!review.safe||cycle===maxCycles)return{question,status:'blocked',review,cycles:cycle,source_status:'unverified',provenance,disclaimer:'Questão bloqueada; não pode ser publicada ao estudante.'};
  assertBudget();const repaired=await pair.generator.generate('Reconstrua a questão corrigindo somente problemas demonstrados. Produza JSON completo no mesmo schema. Não alegue revisão humana ou fonte verificada.',`Blueprint: ${JSON.stringify(blueprint)}\nQuestão atual: ${JSON.stringify(question)}\nRevisão cega: ${JSON.stringify(review)}\nA resposta do revisor concorda com o gabarito? ${agrees}. Corrija ambiguidades, mérito ou qualidade e devolva o item completo.`);provenance.push({step:'repair',cycle:cycle+1,provider:repaired.usage.provider,model:repaired.usage.model,cost:cost(repaired)});question=generatedQuestionSchema.parse(json(repaired.text));
 }
 throw new Error('Estado inalcançável do pipeline');
}
