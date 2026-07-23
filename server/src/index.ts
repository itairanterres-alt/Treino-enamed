import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { ZodError } from 'zod';
import { runPipeline } from './pipeline.js';
import { assertAdminToken, assertEditorToken, savePipelineResult } from './database.js';
import { cancelGenerationJob, createGenerationJob, listGenerationJobs, resumeGenerationJob } from './job-store.js';
import { startGenerationWorker } from './job-worker.js';

const app = express();
const port = Number(process.env.PORT || process.env.API_PORT || 8787);
const production = process.env.NODE_ENV === 'production';
app.disable('x-powered-by');
app.use(cors({ origin: process.env.APP_ORIGIN || (production ? false : 'http://localhost:5173') }));
app.use(express.json({ limit: '2mb' }));
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/questions/generate', async (req, res) => {
  try {
    await assertEditorToken(req.header('authorization'));
    const result = await runPipeline(req.body);
    const saved = await savePipelineResult(req.body, result);
    res.json({ ...result, persistence: saved ? { status: 'saved', ...saved } : { status: 'demo' } });
  } catch (error) {
    if (error instanceof ZodError) return res.status(422).json({ error: 'schema_invalid', issues: error.issues });
    const message = error instanceof Error ? error.message : 'Falha desconhecida';
    if (message === 'AUTH_REQUIRED') return res.status(401).json({ error: 'auth_required', message: 'Faça login para usar o Estúdio.' });
    if (message === 'EDITOR_REQUIRED') return res.status(403).json({ error: 'editor_required', message: 'Apenas revisores e administradores podem gerar questões.' });
    res.status(message.includes('Orçamento') ? 429 : 500).json({ error: 'pipeline_failed', message });
  }
});

app.get('/api/jobs',async(req,res)=>{
 try{
  await assertAdminToken(req.header('authorization'));
  res.json({jobs:await listGenerationJobs()});
 }catch(error){respondError(res,error)}
});

app.post('/api/jobs',async(req,res)=>{
 try{
  const admin=await assertAdminToken(req.header('authorization'));
  const job=await createGenerationJob(admin.id,req.body);
  res.status(201).json({job});
 }catch(error){respondError(res,error)}
});

app.post('/api/jobs/:id/resume',async(req,res)=>{
 try{
  await assertAdminToken(req.header('authorization'));
  res.json({job:await resumeGenerationJob(req.params.id)});
 }catch(error){respondError(res,error)}
});

app.post('/api/jobs/:id/cancel',async(req,res)=>{
 try{
  await assertAdminToken(req.header('authorization'));
  res.json({job:await cancelGenerationJob(req.params.id)});
 }catch(error){respondError(res,error)}
});

if (production) {
  const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist');
  app.use(express.static(webRoot, { maxAge: '1h', index: false }));
  app.use((req, res, next) => {
    if (req.method === 'GET' && req.accepts('html')) return res.sendFile(path.join(webRoot, 'index.html'));
    next();
  });
}
app.listen(port, () => {
 console.log(`Treino ENAMED disponível na porta ${port}`);
 startGenerationWorker();
});

function respondError(res:express.Response,error:unknown){
 if(error instanceof ZodError)return res.status(422).json({error:'schema_invalid',issues:error.issues,message:'O lote não corresponde ao formato esperado.'});
 const message=error instanceof Error?error.message:'Falha desconhecida';
 if(message==='AUTH_REQUIRED')return res.status(401).json({error:'auth_required',message:'Faça login para continuar.'});
 if(message==='EDITOR_REQUIRED'||message==='ADMIN_REQUIRED')return res.status(403).json({error:'access_denied',message:'Apenas administradores podem formar o banco.'});
 if(message==='DATABASE_REQUIRED')return res.status(503).json({error:'database_required',message:'Configure a chave secreta do Supabase no servidor.'});
 return res.status(message.includes('Orçamento')?429:500).json({error:'request_failed',message});
}
