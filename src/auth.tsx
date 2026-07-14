import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createClient, type User } from '@supabase/supabase-js';

export type Role='student'|'reviewer'|'analyst'|'admin';
export type AppUser={id:string;email:string;name:string;phase:number;role:Role;mode:'demo'|'supabase'};
type AuthValue={user:AppUser|null;loading:boolean;signIn:(email:string)=>Promise<string>;enterDemo:(role:'student'|'admin')=>void;signOut:()=>Promise<void>};
const AuthContext=createContext<AuthValue|null>(null);
const url=import.meta.env.VITE_SUPABASE_URL as string|undefined;
const anon=import.meta.env.VITE_SUPABASE_ANON_KEY as string|undefined;
export const supabase=url&&anon?createClient(url,anon):null;

function mapUser(user:User):AppUser{return{id:user.id,email:user.email||'',name:user.user_metadata?.name||user.email?.split('@')[0]||'Estudante',phase:Number(user.user_metadata?.phase||9),role:(user.app_metadata?.role||'student') as Role,mode:'supabase'}}
export function AuthProvider({children}:{children:ReactNode}){
 const [user,setUser]=useState<AppUser|null>(()=>{const raw=localStorage.getItem('treino-demo-user');return raw?JSON.parse(raw):null});
 const [loading,setLoading]=useState(Boolean(supabase));
 useEffect(()=>{if(!supabase)return;supabase.auth.getUser().then(({data})=>{if(data.user)setUser(mapUser(data.user));setLoading(false)});const {data}=supabase.auth.onAuthStateChange((_e,s)=>setUser(s?.user?mapUser(s.user):null));return()=>data.subscription.unsubscribe()},[]);
 const value=useMemo<AuthValue>(()=>({user,loading,signIn:async(email)=>{if(!supabase)return'Configure o Supabase para enviar um link real.';const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.origin}});if(error)throw error;return'Enviamos um link de acesso para o seu e-mail.'},enterDemo:(role)=>{const u:AppUser=role==='admin'?{id:'demo-admin',email:'admin@demo.local',name:'Administrador',phase:0,role:'admin',mode:'demo'}:{id:'demo-student',email:'estudante@demo.local',name:'Estudante demonstrativo',phase:10,role:'student',mode:'demo'};localStorage.setItem('treino-demo-user',JSON.stringify(u));setUser(u)},signOut:async()=>{localStorage.removeItem('treino-demo-user');if(supabase)await supabase.auth.signOut();setUser(null)}}),[user,loading]);
 return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth(){const v=useContext(AuthContext);if(!v)throw new Error('useAuth exige AuthProvider');return v}
