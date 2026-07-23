import { useCallback, useEffect, useState } from 'react';
import { Ban, DatabaseZap, FileJson, LoaderCircle, Play, RotateCcw } from 'lucide-react';
import { supabase, useAuth } from './auth';

type Job={id:string;mode:'generate'|'adapt';status:string;total_items:number;processed_items:number;auto_verified_items:number;blocked_items:number;failed_items:number;estimated_cost_usd:number;budget_usd:number;last_error:string|null;created_at:string};
type Blueprint={area:string;topic:string;competency:string;scenario:string;decision_type:'diagnostico'|'investigacao'|'conduta'|'prevencao'|'encaminhamento';care_setting:'aps'|'ambulatorio'|'emergencia'|'enfermaria'|'centro_cirurgico'|'maternidade';item_format:'automatico'|'vinheta_clinica'|'enunciado_direto';learning_objective:string;difficulty:'baixa'|'intermediaria'|'alta'};
const areas=['Clínica Médica','Cirurgia','Pediatria','Ginecologia e Obstetrícia','Medicina de Família e Comunidade'];

async function api(path:string,init?:RequestInit){
 const session=await supabase?.auth.getSession();const accessToken=session?.data.session?.access_token||'';
 const response=await fetch(path,{...init,headers:{'Content-Type':'application/json',Authorization:`Bearer ${accessToken}`,...init?.headers}});
 const body=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(body.message||'Não foi possível concluir a operação.');
 return body;
}
function text(value:unknown,fallback:string){return typeof value==='string'&&value.trim()?value.trim():fallback}
function normalizeBlueprint(raw:Record<string,unknown>):Blueprint{
 const setting=String(raw.care_setting||'ambulatorio'),decision=String(raw.decision_type||'conduta'),format=String(raw.item_format||'automatico'),difficulty=String(raw.difficulty||'intermediaria');
 return{area:text(raw.area,'Clínica Médica'),topic:text(raw.topic,'Tema importado'),competency:text(raw.competency,'Tomada de decisão clínica'),scenario:text(raw.scenario,text(raw.care_setting,'Cenário clínico')),
  decision_type:(['diagnostico','investigacao','conduta','prevencao','encaminhamento'].includes(decision)?decision:'conduta') as Blueprint['decision_type'],
  care_setting:(['aps','ambulatorio','emergencia','enfermaria','centro_cirurgico','maternidade'].includes(setting)?setting:'ambulatorio') as Blueprint['care_setting'],
  item_format:(['automatico','vinheta_clinica','enunciado_direto'].includes(format)?format:'automatico') as Blueprint['item_format'],
  learning_objective:text(raw.learning_objective,'Aplicar raciocínio clínico para escolher a decisão mais adequada.'),
  difficulty:(['baixa','intermediaria','alta'].includes(difficulty)?difficulty:'intermediaria') as Blueprint['difficulty']};
}
function normalizeImport(raw:unknown,policy:'publishable'|'reference_only'){
 const rows=Array.isArray(raw)?raw:(raw&&typeof raw==='object'&&Array.isArray((raw as {items?:unknown[]}).items)?(raw as {items:unknown[]}).items:null);
 if(!rows?.length)throw new Error('O JSON precisa conter uma lista de questões ou um objeto com o campo "items".');
 if(rows.length>50)throw new Error('Envie no máximo 50 questões por lote.');
 return rows.map((value,index)=>{
  if(!value||typeof value!=='object')throw new Error(`Item ${index+1} inválido.`);
  const row=value as Record<string,unknown>,blueprint=normalizeBlueprint((row.blueprint&&typeof row.blueprint==='object'?row.blueprint:row) as Record<string,unknown>);
  const question=(row.question&&typeof row.question==='object'?row.question:row) as Record<string,unknown>;
  const alternatives=Array.isArray(question.alternatives)?question.alternatives.map((alt,i)=>({id:text((alt as Record<string,unknown>).id,['A','B','C','D'][i]),text:text((alt as Record<string,unknown>).text,'')})):null;
  const source_id=text(row.source_id,`importado-${index+1}`);
  if(policy==='reference_only')return{source_id,source_policy:policy,blueprint};
  if(!alternatives||alternatives.length!==4||!question.correct)throw new Error(`Item ${index+1}: faltam enunciado, quatro alternativas ou gabarito.`);
  return{source_id,source_policy:policy,blueprint,source_item:{stem:text(question.stem,''),alternatives,correct:question.correct}};
 });
}

export function BankFactory(){
 const {user}=useAuth();const [mode,setMode]=useState<'generate'|'adapt'>('generate');const [quantity,setQuantity]=useState(20);const [budget,setBudget]=useState(2);const [difficulty,setDifficulty]=useState<'baixa'|'intermediaria'|'alta'>('intermediaria');const [selected,setSelected]=useState(areas);const [file,setFile]=useState<File|null>(null);const [policy,setPolicy]=useState<'publishable'|'reference_only'>('reference_only');const [rights,setRights]=useState(false);const [jobs,setJobs]=useState<Job[]>([]);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const refresh=useCallback(async()=>{if(user?.mode!=='supabase')return;try{setJobs((await api('/api/jobs')).jobs)}catch(e){setError(e instanceof Error?e.message:'Falha ao consultar lotes.')}},[user?.mode]);
 useEffect(()=>{void refresh();const timer=setInterval(()=>void refresh(),8000);return()=>clearInterval(timer)},[refresh]);
 const create=async()=>{setBusy(true);setError('');try{
  let body:unknown;
  if(mode==='generate'){if(!selected.length)throw new Error('Escolha pelo menos uma área.');body={mode,quantity,areas:selected,difficulty,budget_usd:budget}}
  else{if(!file)throw new Error('Escolha o arquivo JSON.');if(policy==='publishable'&&!rights)throw new Error('Confirme que o uso e a adaptação do banco são autorizados.');body={mode,items:normalizeImport(JSON.parse(await file.text()),policy),budget_usd:budget}}
  await api('/api/jobs',{method:'POST',body:JSON.stringify(body)});await refresh();setFile(null);
 }catch(e){setError(e instanceof Error?e.message:'Falha ao criar lote.')}finally{setBusy(false)}};
 const action=async(id:string,verb:'resume'|'cancel')=>{setBusy(true);setError('');try{await api(`/api/jobs/${id}/${verb}`,{method:'POST'});await refresh()}catch(e){setError(e instanceof Error?e.message:'Falha na operação.')}finally{setBusy(false)}};
 if(user?.mode!=='supabase')return <section className="panel bankFactory"><h2>Formar banco</h2><p>Disponível após entrar como administrador pelo Supabase. O modo demonstrativo não chama modelos nem grava questões.</p></section>;
 return <section className="panel bankFactory"><div className="sectionTitle"><div><p className="eyebrow">FÁBRICA AUTÔNOMA</p><h2>Formar banco</h2><p>Defina o lote uma vez. O servidor gera ou adapta, verifica às cegas, repara e publica somente o que passar.</p></div><DatabaseZap/></div><div className="factoryTabs"><button className={mode==='generate'?'active':''} onClick={()=>setMode('generate')}>Gerar inéditas</button><button className={mode==='adapt'?'active':''} onClick={()=>setMode('adapt')}>Adaptar banco</button></div>
 {mode==='generate'?<div className="factoryForm"><label>Quantidade<input type="number" min="1" max="100" value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label><label>Dificuldade<select value={difficulty} onChange={e=>setDifficulty(e.target.value as typeof difficulty)}><option value="baixa">Baixa</option><option value="intermediaria">Intermediária</option><option value="alta">Alta</option></select></label><fieldset><legend>Áreas</legend>{areas.map(area=><label key={area}><input type="checkbox" checked={selected.includes(area)} onChange={e=>setSelected(e.target.checked?[...selected,area]:selected.filter(x=>x!==area))}/>{area}</label>)}</fieldset></div>:<div className="factoryForm adapt"><label className="file"><FileJson/>Banco em JSON<input type="file" accept=".json,application/json" onChange={e=>setFile(e.target.files?.[0]||null)}/><small>{file?.name||'Até 50 itens por lote'}</small></label><label>Política da fonte<select value={policy} onChange={e=>setPolicy(e.target.value as typeof policy)}><option value="reference_only">Somente referência</option><option value="publishable">Uso e adaptação autorizados</option></select></label><p className="sourcePolicy">{policy==='reference_only'?'O texto original não será armazenado nem reescrito. O sistema usará apenas o blueprint clínico para criar uma questão independente.':'O item-fonte será armazenado e reconstruído. Use apenas material próprio, licenciado ou expressamente autorizado.'}</p>{policy==='publishable'&&<label className="rights"><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/>Confirmo que tenho autorização para usar e adaptar este banco.</label>}</div>}
 <div className="factorySubmit"><label>Limite deste lote (US$)<input type="number" min=".1" max="100" step=".1" value={budget} onChange={e=>setBudget(Number(e.target.value))}/></label><button className="primary" disabled={busy} onClick={create}>{busy?<LoaderCircle className="spin"/>:<Play/>}Iniciar lote</button></div>{error&&<p className="reviewError">{error}</p>}
 <div className="jobList"><h3>Lotes recentes</h3>{jobs.length?jobs.map(job=>{const pct=job.total_items?Math.round(job.processed_items/job.total_items*100):0;return <article key={job.id}><div><b>{job.mode==='generate'?'Geração inédita':'Adaptação'} · {job.total_items} itens</b><small>{new Date(job.created_at).toLocaleString('pt-BR')} · {job.status}</small></div><div className="jobProgress"><span style={{width:`${pct}%`}}/></div><p>{job.processed_items}/{job.total_items} processados · {job.auto_verified_items} publicados · {job.blocked_items} bloqueados · {job.failed_items} falhas · US$ {Number(job.estimated_cost_usd).toFixed(2)}/{Number(job.budget_usd).toFixed(2)}</p>{job.last_error&&<small className="jobError">{job.last_error}</small>}<div className="jobActions">{job.status==='paused'&&<button onClick={()=>action(job.id,'resume')}><RotateCcw/>Retomar</button>}{['queued','running','paused'].includes(job.status)&&<button onClick={()=>action(job.id,'cancel')}><Ban/>Cancelar</button>}</div></article>}):<p>Nenhum lote iniciado.</p>}</div>
 </section>;
}
