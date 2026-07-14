# Treino ENAMED

Protótipo independente de treino formativo para o ENAMED. Não possui vínculo oficial com o INEP, MEC ou qualquer instituição de ensino.

## Primeira entrega

- treino rápido com quatro alternativas;
- opção “Não tenho certeza” e confiança;
- feedback por alternativa;
- caderno de erros persistido localmente;
- leitura de calibração confiança × acerto;
- Estúdio de Questões e visualização do pipeline;
- estados explícitos de revisão.

## Executar

```bash
npm install
npm run dev
```

Chaves de IA nunca devem usar o prefixo `VITE_`. O pipeline Claude/Gemini será executado somente no servidor.

Para persistir as gerações, aplique `supabase/schema.sql` e configure `SUPABASE_URL` e
`SUPABASE_SERVICE_ROLE_KEY` exclusivamente no backend. Sem essas variáveis, o Estúdio continua
funcionando em modo demonstrativo e informa que o resultado não foi persistido.

## Estados de uma questão

- `especialista`: revisão humana confirmada;
- `verificada_ia`: verificações automáticas concluídas, sem revisão humana;
- `experimental`: ainda não completou todos os gates.

## Aviso

Os quatro itens incluídos são dados demonstrativos e não constituem conteúdo clínico pronto para publicação.
