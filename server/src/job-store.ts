import type { z } from 'zod';
import { serviceDatabase } from './database.js';
import { createGenerationJobSchema } from './schema.js';

type CreateJob=z.infer<typeof createGenerationJobSchema>;
export type ClaimedJobItem={
 item_id:string;
 job_id:string;
 position:number;
 mode:'generate'|'adapt';
 config:Record<string,unknown>;
 input:Record<string,unknown>;
 budget_usd:number;
 current_cost_usd:number;
};

function requiredDatabase(){
 const db=serviceDatabase();
 if(!db)throw new Error('DATABASE_REQUIRED');
 return db;
}

export async function createGenerationJob(requestedBy:string,raw:unknown){
 const request=createGenerationJobSchema.parse(raw);
 const db=requiredDatabase();
 const total=request.mode==='generate'?request.quantity:request.items.length;
 const config=request.mode==='generate'
  ?{areas:request.areas,difficulty:request.difficulty}
  :{sources:request.items.map(item=>({source_id:item.source_id,source_policy:item.source_policy}))};
 const{data:job,error:jobError}=await db.from('generation_jobs').insert({
  requested_by:requestedBy,mode:request.mode,status:'queued',config,total_items:total,budget_usd:request.budget_usd,
 }).select('*').single();
 if(jobError)throw new Error(`Falha ao criar lote: ${jobError.message}`);
 const inputs:Array<{job_id:string;position:number;input:Record<string,unknown>}>=request.mode==='generate'
  ?Array.from({length:request.quantity},(_,position)=>({
    job_id:job.id,position:position+1,input:{area:request.areas[position%request.areas.length],difficulty:request.difficulty},
   }))
  :request.items.map((item,position)=>({
    job_id:job.id,
    position:position+1,
    input:item.source_policy==='reference_only'
      ?{source_id:item.source_id,source_policy:item.source_policy,blueprint:item.blueprint}
      :item,
   }));
 const{error:itemError}=await db.from('generation_job_items').insert(inputs as never[]);
 if(itemError){
  await db.from('generation_jobs').delete().eq('id',job.id);
  throw new Error(`Falha ao preparar itens do lote: ${itemError.message}`);
 }
 return job;
}

export async function listGenerationJobs(){
 const db=requiredDatabase();
 const{data,error}=await db.from('generation_jobs')
  .select('id,mode,status,total_items,processed_items,auto_verified_items,blocked_items,failed_items,estimated_cost_usd,budget_usd,last_error,created_at,started_at,completed_at,heartbeat_at')
  .order('created_at',{ascending:false}).limit(20);
 if(error)throw new Error(`Falha ao listar lotes: ${error.message}`);
 return data||[];
}

export async function claimGenerationItem():Promise<ClaimedJobItem|null>{
 const db=requiredDatabase();
 const{data,error}=await db.rpc('claim_generation_job_item');
 if(error)throw new Error(`Falha ao reivindicar item: ${error.message}`);
 return (data?.[0] as ClaimedJobItem|undefined)||null;
}

export async function completeGenerationItem(itemId:string,outcome:'auto_verified'|'blocked',questionId:string,cost:number){
 const db=requiredDatabase();
 const{error}=await db.rpc('complete_generation_job_item',{p_item_id:itemId,p_outcome:outcome,p_question_id:questionId,p_cost:cost});
 if(error)throw new Error(`Falha ao concluir item: ${error.message}`);
}

export async function failGenerationItem(itemId:string,errorMessage:string){
 const db=requiredDatabase();
 const{error}=await db.rpc('fail_generation_job_item',{p_item_id:itemId,p_error:errorMessage});
 if(error)throw new Error(`Falha ao registrar erro do item: ${error.message}`);
}

export async function pauseGenerationItem(itemId:string,errorMessage:string){
 const db=requiredDatabase();
 const{error}=await db.rpc('pause_generation_job_item',{p_item_id:itemId,p_error:errorMessage});
 if(error)throw new Error(`Falha ao pausar lote: ${error.message}`);
}

export async function resumeGenerationJob(jobId:string){
 const db=requiredDatabase();
 const{data,error}=await db.from('generation_jobs').update({status:'queued',last_error:null}).eq('id',jobId).eq('status','paused').select('id').maybeSingle();
 if(error)throw new Error(`Falha ao retomar lote: ${error.message}`);
 if(!data)throw new Error('Lote pausado não encontrado.');
 return data;
}

export async function cancelGenerationJob(jobId:string){
 const db=requiredDatabase();
 const{data,error}=await db.from('generation_jobs').update({status:'cancelled',completed_at:new Date().toISOString()}).eq('id',jobId).in('status',['queued','running','paused']).select('id').maybeSingle();
 if(error)throw new Error(`Falha ao cancelar lote: ${error.message}`);
 if(!data)throw new Error('Lote ativo não encontrado.');
 return data;
}
