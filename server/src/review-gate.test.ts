import{describe,expect,it}from'vitest';import{rubricIssues}from'./review-gate.js';
const dimension={score:2 as const,evidence:'Critério integralmente atendido.'};
const review={chosen_answer:'A' as const,safe:true,second_defensible_answer:false,answerable_without_case:false,lead_in_reveals_answer:false,nonfunctional_distractors:[],rubric:{decision_focus:dimension,data_sufficiency:dimension,distractor_plausibility:dimension,cue_absence:dimension,clinical_safety:dimension,vignette_necessity:dimension,intern_appropriateness:dimension,option_homogeneity:dimension,distractor_quality:dimension,lead_in_neutrality:dimension,discrimination:dimension},blocking_issues:[],quality_issues:[],source_needs_check:true,recommendation:'approve' as const};
describe('gate da régua qualitativa',()=>{
 it('aprova somente dimensões integralmente atendidas',()=>expect(rubricIssues(review)).toEqual([]));
 it('expõe dimensão que exige reparo',()=>expect(rubricIssues({...review,rubric:{...review.rubric,cue_absence:{score:1,evidence:'A alternativa correta é muito mais específica.'}}})).toEqual(['Ausência de pistas: A alternativa correta é muito mais específica.']));
 it('rejeita distrator não funcional mesmo com notas máximas',()=>expect(rubricIssues({...review,nonfunctional_distractors:['D']})).toContain('Distratores não funcionais: D.'));
 it('rejeita questão respondível sem o caso',()=>expect(rubricIssues({...review,answerable_without_case:true})).toContain('O item pode ser respondido sem usar os dados da vinheta.'));
});
