# Treino ENAMED

Protótipo independente de treino formativo para o ENAMED. Não possui vínculo oficial com o INEP, MEC ou qualquer instituição de ensino.

## Primeira entrega

- treino rápido com quatro alternativas;
- opção “Não tenho certeza” e confiança;
- feedback por alternativa;
- caderno de erros persistido localmente;
- leitura de calibração confiança × acerto;
- fábrica autônoma de questões no painel administrativo;
- geração inédita ou adaptação de bancos com uso autorizado;
- fila persistente, limite de custo, revisão cega e reparo automático;
- estados explícitos de revisão.

## Executar

```bash
npm install
npm run dev
```

Chaves de IA nunca devem usar o prefixo `VITE_`. O pipeline Claude/Gemini será executado somente no servidor.

Para persistir as gerações, aplique as migrações versionadas e configure `SUPABASE_URL` e
`SUPABASE_SECRET_KEY` exclusivamente no backend. Sem essas variáveis, a fábrica fica
indisponível e o restante do aplicativo pode ser explorado em modo demonstrativo.

Em “Formar banco”, fontes de uso autorizado podem ser reconstruídas diretamente. A opção
“somente referência” envia apenas o blueprint clínico: o texto original não é armazenado
na fila nem parafraseado. Questões aprovadas pelo loop entram como `verificada_ia`;
questões bloqueadas nunca são sorteadas para estudantes.

## Estados de uma questão

- `especialista`: revisão humana confirmada;
- `verificada_ia`: verificações automáticas concluídas, sem revisão humana;
- `experimental`: ainda não completou todos os gates.

## Aviso

Os quatro itens incluídos são dados demonstrativos e não constituem conteúdo clínico pronto para publicação.
