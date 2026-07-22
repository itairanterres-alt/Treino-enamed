import{assertBudget,recordEstimatedCost}from'./budget.js';
import{blueprintSchema,generatedQuestionSchema,reviewSchema}from'./schema.js';
import{providers,type ModelProvider,type ProviderResult}from'./providers.js';
import{benchmarkAgainstEnamed2025}from'./enamed-benchmark.js';
import{rubricIssues}from'./review-gate.js';
import{lintItem}from'./item-lint.js';

const json=(text:string)=>JSON.parse(text.replace(/^```json\s*/, '').replace(/```\s*$/, ''));
const cost=(result:ProviderResult)=>recordEstimatedCost(result.usage.provider,result.usage.inputTokens,result.usage.outputTokens);
type Provenance={step:string;cycle:number;provider:string;model:string;cost:number};
type Pair={generator:ModelProvider;reviewer:ModelProvider};

export async function runPipeline(input:unknown,pair:Pair=providers()){
 assertBudget();
 const blueprint=blueprintSchema.parse(input);
 const maxCycles=Math.max(0,Math.min(3,Number(process.env.AI_MAX_REPAIR_CYCLES||2)));
 const provenance:Provenance[]=[];
 const generated=await pair.generator.generate(
  'Crie uma questão inédita para internos de Medicina. Avalie uma decisão esperada de um concluinte atuando sob supervisão. Use vinheta somente quando os dados do caso forem indispensáveis; caso contrário, use enunciado direto. Faça pergunta fechada, quatro alternativas ABCD homogêneas e distratores ligados a erros reais. Responda apenas JSON. Não alegue revisão humana ou fonte verificada e não invente referência bibliográfica.',
  `Blueprint: ${JSON.stringify(blueprint)}. Produza area, topic, item_format (vinheta_clinica/enunciado_direto), stem, alternatives[{id,text,rationale}], correct, pearl, source, source_claim e source_evidence{title,issuer,year,locator,excerpt,url opcional}. Justificativas ficam em rationale, nunca dentro da alternativa.`,
 );
 provenance.push({step:'generate',cycle:0,provider:generated.usage.provider,model:generated.usage.model,cost:cost(generated)});
 let question=generatedQuestionSchema.parse(json(generated.text));
 let lastReview:null|ReturnType<typeof reviewSchema.parse>=null;

 for(let cycle=0;cycle<=maxCycles;cycle++){
  const deterministic=lintItem(question);
  const benchmark=benchmarkAgainstEnamed2025(question);
  const audit={...deterministic,warnings:[...deterministic.warnings,...benchmark.issues.map(issue=>`Referência de extensão: ${issue}`)]};
  const preReviewIssues=deterministic.repair_issues;
  if(preReviewIssues.length){
   if(cycle===maxCycles)return blocked(blueprint,question,lastReview,benchmark,audit,cycle,provenance,'Os defeitos objetivos persistiram após o limite de reparos.');
   question=await repair(pair,blueprint,question,cycle+1,provenance,{deterministic:preReviewIssues,warnings:audit.warnings});
   continue;
  }

  assertBudget();
  const blinded={...question,correct:undefined,pearl:undefined,source:undefined,source_claim:undefined,source_evidence:undefined,alternatives:question.alternatives.map(({rationale,...alternative})=>alternative)};
  const reviewed=await pair.reviewer.generate(
   'Atue como elaborador experiente de avaliação clínica para internos. Resolva às cegas e critique sem confiar no gabarito do autor. Responda somente JSON.',
   `Blueprint: ${JSON.stringify(blueprint)}. Questão cega: ${JSON.stringify(blinded)}. Produza chosen_answer (A/B/C/D/NONE/AMBIGUOUS), safe e rubric com nove dimensões: decision_focus, data_sufficiency, distractor_plausibility, cue_absence, clinical_safety, vignette_necessity, intern_appropriateness, option_homogeneity e distractor_quality. Em vignette_necessity, score 2 significa que a vinheta é indispensável ou que o enunciado direto foi corretamente escolhido. Em intern_appropriateness, julgue uma decisão esperada de concluinte sob supervisão. Em distractor_quality, exija erros de raciocínio clínico plausíveis. Cada dimensão recebe score 0 (falha grave), 1 (requer reparo) ou 2 (atende integralmente) e evidence concreta. Produza ainda blocking_issues[], quality_issues[], source_needs_check e recommendation (approve/repair/block).`,
  );
  provenance.push({step:'blind_review',cycle,provider:reviewed.usage.provider,model:reviewed.usage.model,cost:cost(reviewed)});
  const review=reviewSchema.parse(json(reviewed.text));lastReview=review;
  const agrees=review.chosen_answer===question.correct;
  const qualitativeIssues=rubricIssues(review);
  if(review.safe&&agrees&&review.recommendation==='approve'&&!qualitativeIssues.length)return{blueprint,question,status:'auto_verified',review,benchmark,deterministic:audit,qualitative_issues:qualitativeIssues,cycles:cycle,source_status:'unverified',provenance,disclaimer:'Verificação automática não equivale a revisão por especialista. A fonte ainda precisa de confirmação documental.'};
  if(review.recommendation==='block'||!review.safe||cycle===maxCycles)return blocked(blueprint,question,review,benchmark,audit,cycle,provenance,'A revisão cega bloqueou a questão ou o limite de reparos foi atingido.');
  question=await repair(pair,blueprint,question,cycle+1,provenance,{blind_review:review,qualitative_issues:qualitativeIssues,answer_agrees:agrees});
 }
 throw new Error('Estado inalcançável do pipeline');
}

async function repair(pair:Pair,blueprint:unknown,question:unknown,cycle:number,provenance:Provenance[],issues:unknown){
 assertBudget();
 const result=await pair.generator.generate('Reconstrua a questão corrigindo somente os problemas demonstrados. Mantenha o nível de decisão esperado de um interno sob supervisão. Produza JSON completo no mesmo schema e não alegue revisão humana ou fonte verificada.',`Blueprint: ${JSON.stringify(blueprint)}\nQuestão atual: ${JSON.stringify(question)}\nProblemas demonstrados: ${JSON.stringify(issues)}\nCorrija e devolva o item completo.`);
 provenance.push({step:'repair',cycle,provider:result.usage.provider,model:result.usage.model,cost:cost(result)});
 return generatedQuestionSchema.parse(json(result.text));
}

function blocked(blueprint:unknown,question:unknown,review:unknown,benchmark:unknown,deterministic:unknown,cycles:number,provenance:Provenance[],reason:string){
 return{blueprint,question,status:'blocked',review,benchmark,deterministic,cycles,source_status:'unverified',provenance,disclaimer:`Questão bloqueada; não pode ser publicada ao estudante. ${reason}`};
}
