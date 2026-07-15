import { z } from 'zod';

export const sourceKindSchema=z.enum(['official_enamed','official_enade_medicine','official_revalida','public_progress_test','third_party_mock','institutional_reference']);
export const usagePolicySchema=z.enum(['publishable','reference_only','prohibited']);
const itemSchema=z.object({external_id:z.string().min(1),locator:z.string().min(1),content_hash:z.string().regex(/^[a-f0-9]{64}$/),body:z.record(z.string(),z.any()).nullable().optional(),metrics:z.record(z.string(),z.any()).default({}),metadata:z.record(z.string(),z.any()).default({})});
const sourceSchema=z.object({title:z.string().min(3),kind:sourceKindSchema,usage_policy:usagePolicySchema,rights_verified:z.boolean(),publisher:z.string().min(2),year:z.number().int().min(2000).max(2100),source_url:z.string().url(),metadata:z.record(z.string(),z.any()).default({})});
export const referenceImportSchema=z.object({source:sourceSchema,items:z.array(itemSchema).min(1)}).superRefine((value,ctx)=>{if(value.source.usage_policy==='publishable'&&!value.source.rights_verified)ctx.addIssue({code:'custom',path:['source','rights_verified'],message:'Publicação exige direitos verificados'});if(value.source.usage_policy!=='publishable')value.items.forEach((item,index)=>{if(item.body)ctx.addIssue({code:'custom',path:['items',index,'body'],message:'Fonte apenas referencial não pode armazenar texto integral'})})});
export type ReferenceImport=z.infer<typeof referenceImportSchema>;
