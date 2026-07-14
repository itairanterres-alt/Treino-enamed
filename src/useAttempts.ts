import { useEffect, useState } from 'react';
import { supabase } from './auth';
import type { AppUser } from './auth';
import type { Attempt } from './types';

const local=()=>JSON.parse(localStorage.getItem('treino-attempts')||'[]') as Attempt[];
export function useAttempts(user:AppUser|null){
 const [attempts,setAttempts]=useState<Attempt[]>(()=>local());const [persistenceError,setPersistenceError]=useState('');
 useEffect(()=>{if(user?.mode!=='supabase'||!supabase){setAttempts(local());return}let active=true;supabase.from('attempts').select('question_id,question_version,answer,confidence,is_correct,response_time_ms,created_at').eq('user_id',user.id).order('created_at').then(({data})=>{if(active&&data)setAttempts(data.map(a=>({questionId:a.question_id,questionVersion:a.question_version,answer:a.answer as Attempt['answer'],confidence:a.confidence as Attempt['confidence'],correct:a.is_correct,responseTimeMs:a.response_time_ms||undefined,at:a.created_at})))});return()=>{active=false}},[user?.id,user?.mode]);
 const add=async(a:Attempt)=>{setPersistenceError('');setAttempts(v=>{const n=[...v,a];if(user?.mode!=='supabase')localStorage.setItem('treino-attempts',JSON.stringify(n));return n});if(user?.mode==='supabase'&&supabase&&a.questionVersion){const {error}=await supabase.from('attempts').insert({user_id:user.id,question_id:a.questionId,question_version:a.questionVersion,answer:a.answer,confidence:a.confidence,is_correct:a.correct,response_time_ms:a.responseTimeMs});if(error){setAttempts(v=>v.filter(x=>x!==a));setPersistenceError('Sua resposta não foi salva. Verifique a conexão e tente novamente.')}}};
 return {attempts,add,persistenceError};
}
