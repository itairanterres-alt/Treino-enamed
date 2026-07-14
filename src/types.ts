export type Area = 'Clínica Médica'|'Cirurgia'|'Pediatria'|'Ginecologia e Obstetrícia'|'Medicina da Família e Comunidade'|'Saúde Mental'|'Saúde Coletiva';
export type ReviewStatus = 'especialista'|'verificada_ia'|'experimental';
export type Alternative = { id:'A'|'B'|'C'|'D'; text:string; rationale:string };
export type Question = { id:string; area:Area; topic:string; stem:string; alternatives:Alternative[]; correct:Alternative['id']; pearl:string; source:string; status:ReviewStatus };
export type Attempt = { questionId:string; answer:Alternative['id']|'UNCERTAIN'; confidence:1|2|3; correct:boolean; at:string };
