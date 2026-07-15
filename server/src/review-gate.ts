import type{z}from'zod';
import type{reviewSchema}from'./schema.js';

type Review=z.infer<typeof reviewSchema>;
export const RUBRIC_LABELS={decision_focus:'Foco decisório',data_sufficiency:'Suficiência dos dados',distractor_plausibility:'Plausibilidade dos distratores',cue_absence:'Ausência de pistas',clinical_safety:'Segurança clínica'}as const;

export function rubricIssues(review:Review){
 return(Object.keys(RUBRIC_LABELS)as Array<keyof typeof RUBRIC_LABELS>)
  .filter(key=>review.rubric[key].score<2)
  .map(key=>`${RUBRIC_LABELS[key]}: ${review.rubric[key].evidence}`);
}
