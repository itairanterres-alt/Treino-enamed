import { describe,expect,it } from 'vitest';
import { createGenerationJobSchema } from './schema.js';

const blueprint={area:'Pediatria',topic:'Febre no lactente',competency:'Tomada de decisão clínica',scenario:'Emergência',decision_type:'conduta',care_setting:'emergencia',item_format:'automatico',learning_objective:'Definir a abordagem inicial segura do lactente febril',difficulty:'intermediaria'};

describe('lotes autônomos',()=>{
 it('aceita geração por áreas',()=>{expect(createGenerationJobSchema.parse({mode:'generate',quantity:20,areas:['Clínica Médica','Pediatria'],difficulty:'intermediaria',budget_usd:2}).quantity).toBe(20)});
 it('aceita referência sem armazenar a questão-fonte',()=>{const parsed=createGenerationJobSchema.parse({mode:'adapt',budget_usd:1,items:[{source_id:'prova-publica-1',source_policy:'reference_only',blueprint}]});expect(parsed.mode).toBe('adapt')});
 it('exige o item quando a adaptação direta foi autorizada',()=>{expect(()=>createGenerationJobSchema.parse({mode:'adapt',budget_usd:1,items:[{source_id:'banco-1',source_policy:'publishable',blueprint}]})).toThrow()});
});
