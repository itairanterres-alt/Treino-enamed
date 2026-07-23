import type{z}from'zod';
import type{reviewSchema}from'./schema.js';

type Review=z.infer<typeof reviewSchema>;
export const RUBRIC_LABELS={
 decision_focus:'Foco decisório',
 data_sufficiency:'Suficiência dos dados',
 distractor_plausibility:'Plausibilidade dos distratores',
 cue_absence:'Ausência de pistas',
 clinical_safety:'Segurança clínica',
 vignette_necessity:'Necessidade da vinheta',
 intern_appropriateness:'Adequação ao interno',
 option_homogeneity:'Homogeneidade das alternativas',
 distractor_quality:'Qualidade dos distratores',
 lead_in_neutrality:'Neutralidade do enunciado',
 discrimination:'Capacidade discriminativa',
}as const;

export function rubricIssues(review:Review){
 const issues=(Object.keys(RUBRIC_LABELS)as Array<keyof typeof RUBRIC_LABELS>)
  .filter(key=>review.rubric[key].score<2)
  .map(key=>`${RUBRIC_LABELS[key]}: ${review.rubric[key].evidence}`);
 if(review.second_defensible_answer)issues.push('Há uma segunda alternativa clinicamente defensável.');
 if(review.answerable_without_case)issues.push('O item pode ser respondido sem usar os dados da vinheta.');
 if(review.lead_in_reveals_answer)issues.push('O enunciado antecipa a resposta ou sua categoria decisória.');
 if(review.nonfunctional_distractors.length)issues.push(`Distratores não funcionais: ${review.nonfunctional_distractors.join(', ')}.`);
 return issues;
}
