import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type PipelineResult = {
  question: unknown;
  status: string;
  review: unknown;
  cycles: number;
  source_status: string;
  provenance: { cost: number }[];
  disclaimer: string;
};

export type SavedQuestion = { questionId: string; version: number };
let client: SupabaseClient | null | undefined;

export function databaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function database() {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  return client;
}

export async function savePipelineResult(blueprint: unknown, result: PipelineResult): Promise<SavedQuestion | null> {
  const db = database();
  if (!db) return null;
  const { data: question, error: questionError } = await db.from('questions').insert({ status: result.status, current_version: 1 }).select('id').single();
  if (questionError) throw new Error(`Falha ao criar questão: ${questionError.message}`);
  const provenance = {
    blueprint,
    review: result.review,
    cycles: result.cycles,
    source_status: result.source_status,
    disclaimer: result.disclaimer,
    pipeline: result.provenance,
    estimated_cost_usd: result.provenance.reduce((sum, step) => sum + step.cost, 0),
  };
  const { error: versionError } = await db.from('question_versions').insert({ question_id: question.id, version: 1, body: result.question, provenance });
  if (versionError) {
    await db.from('questions').delete().eq('id', question.id);
    throw new Error(`Falha ao salvar versão da questão: ${versionError.message}`);
  }
  return { questionId: question.id, version: 1 };
}
