# Piloto de 20 questões

O lote cobre sete áreas, cinco tipos de decisão, seis ambientes assistenciais e diferentes dificuldades editoriais. Não contém faseamento ou identificação institucional.

## Segurança operacional

- `npm run experiment:validate` valida o lote sem chamar IA.
- A execução real exige simultaneamente `experiment:run` e `EXPERIMENT_CONFIRM=YES`.
- `EXPERIMENT_MAX_ITEMS` permite começar com 1–3 itens.
- O orçamento diário configurado no servidor continua valendo.
- Resultados são gravados após cada item em `tmp/`, permitindo retomada.
- O executor chama o pipeline diretamente e não grava questões no Supabase.

O relatório consolida aprovação automática, bloqueio, itens reparados, falhas técnicas, custo estimado, alertas e dimensões da régua que mais falharam. Nenhum item do piloto é liberado aos alunos.
