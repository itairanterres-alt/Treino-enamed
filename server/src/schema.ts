import { z } from 'zod';
export const alternativeSchema=z.object({id:z.enum(['A','B','C','D']),text:z.string().min(3),rationale:z.string().min(10)});
export const sourceAlternativeSchema=z.object({id:z.enum(['A','B','C','D']),text:z.string().min(3)});
export const sourceEvidenceSchema=z.object({title:z.string().min(8),issuer:z.string().min(3),year:z.number().int().min(2000).max(new Date().getFullYear()),locator:z.string().min(3),excerpt:z.string().min(20).max(500),url:z.string().url().optional()});
export const generatedQuestionSchema=z.object({area:z.string().min(2),topic:z.string().min(2),item_format:z.enum(['vinheta_clinica','enunciado_direto']),stem:z.string().min(40),alternatives:z.array(alternativeSchema).length(4),correct:z.enum(['A','B','C','D']),pearl:z.string().min(15),source:z.string().min(5),source_claim:z.string().min(10),source_evidence:sourceEvidenceSchema}).superRefine((q,ctx)=>{const ids=q.alternatives.map(a=>a.id);if(new Set(ids).size!==4||!['A','B','C','D'].every(x=>ids.includes(x as never)))ctx.addIssue({code:'custom',message:'Alternativas devem ser ABCD, sem repetição'});if(!ids.includes(q.correct))ctx.addIssue({code:'custom',message:'Gabarito ausente nas alternativas'})});
export const blueprintSchema=z.object({area:z.string().min(2),topic:z.string().min(2),competency:z.string().min(2),scenario:z.string().min(2),decision_type:z.enum(['diagnostico','investigacao','conduta','prevencao','encaminhamento']),care_setting:z.enum(['aps','ambulatorio','emergencia','enfermaria','centro_cirurgico','maternidade']),item_format:z.enum(['automatico','vinheta_clinica','enunciado_direto']).default('automatico'),learning_objective:z.string().min(10),source_context:z.string().max(8000).optional(),difficulty:z.enum(['baixa','intermediaria','alta']).default('intermediaria')});
export const sourceQuestionSchema=z.object({
 stem:z.string().min(20),
 alternatives:z.array(sourceAlternativeSchema).length(4),
 correct:z.enum(['A','B','C','D']),
});
export const adaptationInputSchema=z.object({
 source_id:z.string().min(1),
 source_policy:z.enum(['publishable','reference_only']),
 blueprint:blueprintSchema,
 source_item:sourceQuestionSchema.optional(),
}).superRefine((value,ctx)=>{
 if(value.source_policy==='publishable'&&!value.source_item)ctx.addIssue({code:'custom',message:'Fonte autorizada exige source_item para adaptação.'});
});
const generationJobSchema=z.object({
 mode:z.literal('generate'),
 quantity:z.number().int().min(1).max(100),
 areas:z.array(z.string().min(2)).min(1).max(7),
 difficulty:z.enum(['baixa','intermediaria','alta']).default('intermediaria'),
 budget_usd:z.number().positive().max(100),
});
const adaptationJobSchema=z.object({
 mode:z.literal('adapt'),
 items:z.array(adaptationInputSchema).min(1).max(50),
 budget_usd:z.number().positive().max(100),
});
export const createGenerationJobSchema=z.discriminatedUnion('mode',[generationJobSchema,adaptationJobSchema]);
const rubricDimensionSchema=z.object({score:z.number().int().min(0).max(2),evidence:z.string().min(8)});
export const reviewSchema=z.object({
 chosen_answer:z.enum(['A','B','C','D','NONE','AMBIGUOUS']),
 safe:z.boolean(),
 second_defensible_answer:z.boolean(),
 answerable_without_case:z.boolean(),
 lead_in_reveals_answer:z.boolean(),
 nonfunctional_distractors:z.array(z.enum(['A','B','C','D'])).max(3),
 rubric:z.object({
  decision_focus:rubricDimensionSchema,
  data_sufficiency:rubricDimensionSchema,
  distractor_plausibility:rubricDimensionSchema,
  cue_absence:rubricDimensionSchema,
  clinical_safety:rubricDimensionSchema,
  vignette_necessity:rubricDimensionSchema,
  intern_appropriateness:rubricDimensionSchema,
  option_homogeneity:rubricDimensionSchema,
  distractor_quality:rubricDimensionSchema,
  lead_in_neutrality:rubricDimensionSchema,
  discrimination:rubricDimensionSchema,
 }),
 blocking_issues:z.array(z.string()),
 quality_issues:z.array(z.string()),
 source_needs_check:z.boolean(),
 recommendation:z.enum(['approve','repair','block']),
});
