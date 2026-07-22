# Perfil de geração de itens para internos

O Treino-enamed utiliza um perfil neutro destinado a concluintes de Medicina. Não emprega fase, unidade curricular, PPC ou taxonomia institucional.

## Blueprint

- área e assunto;
- objetivo de aprendizagem;
- competência;
- tipo de decisão: diagnóstico, investigação, conduta, prevenção ou encaminhamento;
- ambiente assistencial;
- contexto clínico;
- formato automático, vinheta clínica ou enunciado direto;
- dificuldade editorial prevista;
- material delimitador opcional.

A pergunta de adequação é: **esta decisão é esperada de um concluinte de Medicina atuando sob supervisão?**

## Ordem dos gates

1. O gerador produz o item e a evidência documental candidata.
2. O lint determinístico procura defeitos objetivos antes de consumir a chamada do revisor.
3. Defeito objetivo retorna diretamente ao gerador para reparo.
4. O revisor resolve o item sem gabarito, justificativas ou fonte declarada.
5. A aprovação exige concordância com o gabarito e nota integral nas nove dimensões da régua.
6. A questão permanece fora do banco estudantil até revisão humana e confirmação documental.

## Regras objetivas e alertas

Enunciado negativo, verbo de instrução, todas/nenhuma das anteriores, duplicação, explicação causal dentro da alternativa e pista extrema de comprimento acionam reparo. Linguagem probabilística e termos absolutos geram alerta contextual, pois podem ser legítimos em medicina.

Os comprimentos observados no ENAMED 2025 são referência descritiva, não bloqueio. Isso evita rejeitar enunciados diretos válidos ou transformar uma amostra de prova em norma universal.

## Régua do revisor cego

O revisor avalia foco decisório, suficiência dos dados, plausibilidade clínica, ausência de pistas, segurança, necessidade da vinheta, adequação ao interno, homogeneidade das alternativas e qualidade dos distratores.
