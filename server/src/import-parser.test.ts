import { describe,expect,it } from 'vitest';
import type { ModelProvider,ProviderResult } from './providers.js';
import { extractImportText,structureImport } from './import-parser.js';

const file=(name:string,content:string)=>({originalname:name,buffer:Buffer.from(content)}) as Express.Multer.File;
const blueprint={area:'Clínica Médica',topic:'Hipercalemia',competency:'Tomada de decisão clínica',scenario:'Emergência',decision_type:'conduta',care_setting:'emergencia',item_format:'vinheta_clinica',learning_objective:'Priorizar a estabilização miocárdica na hipercalemia grave',difficulty:'intermediaria'};
class MockProvider implements ModelProvider{
 async generate():Promise<ProviderResult>{return{text:JSON.stringify({items:[{source_id:'original',source_policy:'reference_only',blueprint}]}),usage:{provider:'anthropic',model:'mock',inputTokens:0,outputTokens:0}}}
}

describe('importação de bancos',()=>{
 it('extrai texto simples sem modificar o conteúdo',async()=>{expect(await extractImportText(file('prova.txt','Questão clínica com alternativas A, B, C e D.'))).toContain('Questão clínica')});
 it('mantém apenas o blueprint em modo de referência',async()=>{const result=await structureImport(file('prova-publica.txt','Questão 1. Paciente com doença renal e hipercalemia grave. A) Cálcio. B) Soro. C) Resina. D) Observação. Gabarito: A.'),'reference_only',new MockProvider());expect(result.extracted_items).toBe(1);expect(result.items[0].source_policy).toBe('reference_only');expect(result.items[0].source_item).toBeUndefined()});
});
