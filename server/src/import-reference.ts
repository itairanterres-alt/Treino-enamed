import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { referenceImportSchema } from './reference-schema.js';

const file=process.argv[2];
if(!file)throw new Error('Uso: npm run import:reference -- caminho/arquivo.json');
const input=referenceImportSchema.parse(JSON.parse(await readFile(file,'utf8')));
const url=process.env.SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new Error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente do servidor');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:source,error:sourceError}=await db.from('reference_sources').insert(input.source).select('id').single();
if(sourceError)throw sourceError;
const rows=input.items.map(item=>({...item,source_id:source.id,body:item.body||null}));
const {error:itemError}=await db.from('reference_items').insert(rows);
if(itemError){await db.from('reference_sources').delete().eq('id',source.id);throw itemError}
console.log(`Fonte importada: ${input.source.title} · ${rows.length} item(ns) · política ${input.source.usage_policy}`);
