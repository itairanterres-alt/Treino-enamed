import { assertBudget, recordEstimatedCost } from './budget.js';
import { databaseConfigured, savePipelineResult } from './database.js';
import { claimGenerationItem, completeGenerationItem, failGenerationItem, pauseGenerationItem, type ClaimedJobItem } from './job-store.js';
import { runAdaptationPipeline, runPipeline } from './pipeline.js';
import { providers, type ModelProvider } from './providers.js';
import { adaptationInputSchema, blueprintSchema } from './schema.js';

const parseJson=(text:string)=>JSON.parse(text.replace(/^```json\s*/,'').replace(/```\s*$/,''));
let started=false;
let stopping=false;

async function planBlueprint(item:ClaimedJobItem,generator:ModelProvider){
 assertBudget();
 const area=String(item.input.area||'Clínica Médica');
 const difficulty=String(item.input.difficulty||'intermediaria');
 const response=await generator.generate(
  'Planeje uma questão para internos de Medicina sem escrevê-la. Escolha problema comum, relevante ou potencialmente grave. Varie assunto, cenário e tipo de decisão. Responda somente JSON.',
  `Área: ${area}. Dificuldade: ${difficulty}. Posição no lote: ${item.position}. Produza area, topic, competency, scenario, decision_type (diagnostico/investigacao/conduta/prevencao/encaminhamento), care_setting (aps/ambulatorio/emergencia/enfermaria/centro_cirurgico/maternidade), item_format (automatico/vinheta_clinica/enunciado_direto), learning_objective e difficulty.`,
 );
 const planningCost=recordEstimatedCost(response.usage.provider,response.usage.inputTokens,response.usage.outputTokens);
 return{blueprint:blueprintSchema.parse(parseJson(response.text)),planningCost};
}

async function processItem(item:ClaimedJobItem){
 const pair=providers();
 let planningCost=0;
 let result;
 if(item.mode==='generate'){
  const planned=await planBlueprint(item,pair.generator);
  planningCost=planned.planningCost;
  result=await runPipeline(planned.blueprint,pair);
 }else{
  const adaptation=adaptationInputSchema.parse(item.input);
  result=adaptation.source_policy==='reference_only'
   ?await runPipeline(adaptation.blueprint,pair)
   :await runAdaptationPipeline(adaptation,pair);
 }
 const saved=await savePipelineResult(result.blueprint,result);
 if(!saved)throw new Error('Banco do servidor não configurado para persistir o resultado.');
 const pipelineCost=result.provenance.reduce((sum,entry)=>sum+entry.cost,0);
 const outcome=result.status==='auto_verified'?'auto_verified':'blocked';
 await completeGenerationItem(item.item_id,outcome,saved.questionId,planningCost+pipelineCost);
 console.log(JSON.stringify({event:'generation_item_completed',job:item.job_id,item:item.position,status:result.status,cost:planningCost+pipelineCost}));
}

async function tick(){
 if(stopping)return;
 let claimed:ClaimedJobItem|null=null;
 try{
  claimed=await claimGenerationItem();
  if(claimed)await processItem(claimed);
 }catch(error){
  const message=error instanceof Error?error.message:'Falha desconhecida';
  if(claimed){
   try{
    if(message.includes('Orçamento'))await pauseGenerationItem(claimed.item_id,message);
    else await failGenerationItem(claimed.item_id,message);
   }catch(storeError){
    console.error(JSON.stringify({event:'generation_item_store_failed',message:storeError instanceof Error?storeError.message:'Falha desconhecida'}));
   }
  }else if(!message.includes('DATABASE_REQUIRED')){
   console.error(JSON.stringify({event:'generation_worker_failed',message}));
  }
 }
 const delay=claimed?250:5000;
 const timer=setTimeout(()=>void tick(),delay);
 timer.unref();
}

export function startGenerationWorker(){
 if(started||!databaseConfigured()||process.env.DISABLE_GENERATION_WORKER==='true')return;
 started=true;
 void tick();
}

export function stopGenerationWorker(){stopping=true}
