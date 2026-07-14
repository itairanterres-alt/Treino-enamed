# Arquitetura do MVP

## Princípios

1. Identidade independente e neutra.
2. Conteúdo experimental nunca se apresenta como validado.
3. Regras objetivas são verificadas em código, não por IA.
4. Geração e avaliação clínica usam contextos separados.
5. Toda correção reinicia os gates afetados.
6. Chaves e chamadas de modelos ficam no servidor.
7. Cada execução registra provedor, modelo, tokens, custo estimado e versão do prompt.

## Estratégia de custo e qualidade

- Código: schema, quatro alternativas, resposta única, slugs e campos obrigatórios.
- Modelo econômico: classificação e revisão formal inicial.
- Modelo capaz: geração do item e resolução de divergências.
- Segundo provedor: avaliação clínica cega e detecção de concordância artificial.
- Limites: orçamento diário, máximo de ciclos, cache por hash e interrupção automática.

## Gates

`draft → structurally_valid → clinically_agreed → source_checked → quality_checked → auto_verified → human_reviewed`

`human_reviewed` nunca é atribuído por software.
