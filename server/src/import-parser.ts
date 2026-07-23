import path from 'node:path';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { assertBudget, recordEstimatedCost } from './budget.js';
import { providers, type ModelProvider } from './providers.js';
import { adaptationInputSchema } from './schema.js';

const importedItemsSchema=z.object({items:z.array(adaptationInputSchema).min(1).max(50)});
const cleanJson=(value:string)=>JSON.parse(value.replace(/^```json\s*/,'').replace(/```\s*$/,''));
const safeName=(name:string)=>path.basename(name).replace(/[^\p{L}\p{N}._-]+/gu,'-').slice(0,80);

export async function extractImportText(file:Express.Multer.File){
 const extension=path.extname(file.originalname).toLowerCase();
 if(extension==='.txt'||extension==='.csv'||extension==='.json')return file.buffer.toString('utf8');
 if(extension==='.docx')return (await mammoth.extractRawText({buffer:file.buffer})).value;
 if(extension==='.xlsx'||extension==='.xls'){
  const workbook=XLSX.read(file.buffer,{type:'buffer'});
  return workbook.SheetNames.map(name=>`PLANILHA: ${name}\n${XLSX.utils.sheet_to_csv(workbook.Sheets[name])}`).join('\n\n');
 }
 if(extension==='.pdf'){
  const parser=new PDFParse({data:file.buffer});
  try{return (await parser.getText()).text}finally{await parser.destroy()}
 }
 throw new Error('Formato não aceito. Use JSON, CSV, XLS/XLSX, TXT, DOCX ou PDF.');
}

function chunks(text:string){
 const normalized=text.replace(/\u0000/g,'').replace(/[ \t]+\n/g,'\n').trim();
 if(normalized.length<80)throw new Error('Não foi possível extrair texto suficiente. Se o PDF for escaneado, será necessário OCR.');
 if(normalized.length>70000)throw new Error('O arquivo é grande demais para um único lote. Divida-o em arquivos menores, com até aproximadamente 50 questões.');
 const result:string[]=[];
 for(let start=0;start<normalized.length;start+=14000)result.push(normalized.slice(start,start+14000));
 return result;
}

export async function structureImport(file:Express.Multer.File,policy:'publishable'|'reference_only',generator:ModelProvider=providers().generator){
 const text=await extractImportText(file),parts=chunks(text),items:z.infer<typeof adaptationInputSchema>[]=[],warnings:string[]=[];
 let estimatedCostUsd=0;
 for(let index=0;index<parts.length&&items.length<50;index++){
  assertBudget();
  const result=await generator.generate(
   'Extraia questões médicas de um arquivo para um sistema de treino de internos. Não responda nem corrija as questões. Identifique somente itens completos com quatro alternativas e, quando presente, o gabarito. Classifique área, assunto, cenário e decisão clínica. Ignore cabeçalhos, instruções gerais e comentários. Responda somente JSON. Nunca alegue revisão humana.',
   `Arquivo: ${safeName(file.originalname)}. Trecho ${index+1}/${parts.length}. Política: ${policy}.
Retorne {"items":[...]}, no máximo 15 itens neste trecho. Cada item: source_id; source_policy="${policy}"; blueprint com area, topic, competency, scenario, decision_type (diagnostico/investigacao/conduta/prevencao/encaminhamento), care_setting (aps/ambulatorio/emergencia/enfermaria/centro_cirurgico/maternidade), item_format (automatico/vinheta_clinica/enunciado_direto), learning_objective e difficulty (baixa/intermediaria/alta).
${policy==='publishable'?'Inclua source_item com stem, alternatives[{id:A/B/C/D,text}] e correct. Só inclua item cujo gabarito esteja explícito no arquivo.':'Não inclua o texto, alternativas ou gabarito da questão-fonte; produza apenas o blueprint, suficiente para gerar posteriormente uma questão independente.'}
Conteúdo extraído:
${parts[index]}`,
  );
  estimatedCostUsd+=recordEstimatedCost(result.usage.provider,result.usage.inputTokens,result.usage.outputTokens);
  const parsed=importedItemsSchema.parse(cleanJson(result.text));
  for(const item of parsed.items){
   if(items.length===50)break;
   items.push({...item,source_id:`${safeName(file.originalname)}-${items.length+1}`});
  }
 }
 if(!items.length)throw new Error(policy==='publishable'?'Nenhuma questão completa com quatro alternativas e gabarito explícito foi encontrada.':'Nenhuma questão médica estruturável foi encontrada no arquivo.');
 if(items.length===50)warnings.push('O limite de 50 itens foi atingido; envie o restante em outro lote.');
 return{items,extracted_items:items.length,estimated_cost_usd:Number(estimatedCostUsd.toFixed(6)),warnings};
}
