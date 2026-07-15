# QA visual estratificada — ENAMED 2025

Conferência manual do texto extraído contra o caderno oficial, cobrindo itens curtos, medianos, extensos, com imagem, tabela, quebra de coluna e diferentes estados do gabarito.

| Questão | Página | Caso observado | Resultado |
|---|---:|---|---|
| 5 | 3 | imagem clínica | estrutura e alternativas preservadas; a imagem não é incorporada ao texto |
| 10 | 4 | tabela e anulação administrativa | tabela linearizada; estado vem do gabarito, não do caderno |
| 17 | 6 | extensão mediana | estrutura preservada; subscrito em `O₂` foi perdido |
| 38 | 11 | enunciado extenso e tabela | estrutura e valores preservados, tabela linearizada |
| 40 | 11 | item excluído | estrutura preservada; exclusão vem do gabarito |
| 45 | 12 | enunciado curto | estrutura e quatro alternativas preservadas |
| 100 | 26 | final do caderno e anulação | estrutura preservada; anulação vem do gabarito |

## Decisão de segurança

O extrator serve para análise de referência e pré-processamento, não para publicação automática. Imagens, layout tabular e caracteres sobrescritos/subscritos exigem conferência humana ou uma etapa multimodal específica. A classificação válido/anulado/excluído deve sempre ser reconciliada com o gabarito oficial versionado.

O gate estrutural do gerador usa o envelope empírico dos 90 itens válidos apenas como sinal de formato. Ele não valida correção médica, qualidade pedagógica, direitos de uso ou fidelidade documental.
