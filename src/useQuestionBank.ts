import { useEffect, useState } from 'react';
import { supabase } from './auth';
import { questions as demoQuestions } from './data';
import type { AppUser } from './auth';
import type { Question } from './types';

type Row={id:string;status:'human_reviewed'|'auto_verified';current_version:number;question_versions:{version:number;body:Omit<Question,'id'|'version'|'status'>}[]};
export type TrainingCatalogMode='all_verified'|'reviewed_only';
export function statusesForMode(mode:TrainingCatalogMode){return mode==='all_verified'?['human_reviewed','auto_verified'] as const:['human_reviewed'] as const}

export function useQuestionBank(user:AppUser|null,mode:TrainingCatalogMode){
 const demoForMode=()=>demoQuestions.filter(question=>question.status==='especialista'||(mode==='all_verified'&&question.status==='verificada_ia'));
 const [questions,setQuestions]=useState<Question[]>(user?.mode==='demo'?demoForMode():[]);const [loading,setLoading]=useState(user?.mode==='supabase');const [error,setError]=useState('');
 useEffect(()=>{if(!user){setQuestions([]);setLoading(false);return}if(user.mode==='demo'||!supabase){setQuestions(demoForMode());setLoading(false);return}let active=true;setLoading(true);setError('');supabase.from('questions').select('id,status,current_version,question_versions(version,body)').in('status',[...statusesForMode(mode)]).then(({data,error})=>{if(!active)return;if(error)setError(error.message);else setQuestions(((data||[]) as Row[]).flatMap(row=>{const current=row.question_versions.find(v=>v.version===row.current_version);return current?[{...current.body,id:row.id,version:row.current_version,status:row.status==='human_reviewed'?'especialista' as const:'verificada_ia' as const}]:[]}));setLoading(false)});return()=>{active=false}},[user?.id,user?.mode,mode]);
 return {questions,loading,error};
}
