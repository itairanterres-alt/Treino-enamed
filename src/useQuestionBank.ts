import { useEffect, useState } from 'react';
import { supabase } from './auth';
import { questions as demoQuestions } from './data';
import type { AppUser } from './auth';
import type { Question } from './types';

type Row={id:string;current_version:number;question_versions:{version:number;body:Omit<Question,'id'|'version'|'status'>}[]};

export function useQuestionBank(user:AppUser|null){
 const [questions,setQuestions]=useState<Question[]>(user?.mode==='demo'?demoQuestions:[]);const [loading,setLoading]=useState(user?.mode==='supabase');const [error,setError]=useState('');
 useEffect(()=>{if(!user){setQuestions([]);setLoading(false);return}if(user.mode==='demo'||!supabase){setQuestions(demoQuestions);setLoading(false);return}let active=true;setLoading(true);supabase.from('questions').select('id,current_version,question_versions(version,body)').eq('status','human_reviewed').then(({data,error})=>{if(!active)return;if(error)setError(error.message);else setQuestions(((data||[]) as Row[]).flatMap(row=>{const current=row.question_versions.find(v=>v.version===row.current_version);return current?[{...current.body,id:row.id,version:row.current_version,status:'especialista' as const}]:[]}));setLoading(false)});return()=>{active=false}},[user?.id,user?.mode]);
 return {questions,loading,error};
}
