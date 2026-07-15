# Verificação documental de questões

O gerador fornece apenas uma **evidência candidata**: título, entidade, ano, localizador, trecho curto e a afirmação que pretende sustentar. Esses campos melhoram a auditabilidade, mas permanecem não verificados porque foram produzidos pelo mesmo sistema que criou a questão.

Uma questão só pode receber `human_reviewed` quando um revisor autenticado:

1. revisa mérito clínico, gabarito, distratores e segurança;
2. localiza uma fonte documental adequada fora da resposta do modelo;
3. registra a referência e o localizador efetivamente conferidos;
4. descreve a justificativa da decisão.

O banco armazena separadamente a proposta da IA, no corpo versionado, e a evidência conferida pelo humano, no parecer editorial. Isso preserva a trilha de auditoria e evita substituir silenciosamente uma referência alucinada.
