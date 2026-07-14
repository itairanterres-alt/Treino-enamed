const daily=new Map<string,number>();const today=()=>new Date().toISOString().slice(0,10);
export function assertBudget(){const limit=Number(process.env.AI_DAILY_BUDGET_USD||2);if((daily.get(today())||0)>=limit)throw new Error(`Orçamento diário de IA atingido (US$ ${limit.toFixed(2)})`)}
export function recordEstimatedCost(inputTokens:number,outputTokens:number){const cost=inputTokens/1e6*Number(process.env.AI_INPUT_USD_PER_MTOK||3)+outputTokens/1e6*Number(process.env.AI_OUTPUT_USD_PER_MTOK||15);daily.set(today(),(daily.get(today())||0)+cost);return cost}
export function budgetSnapshot(){return{date:today(),estimatedUsd:daily.get(today())||0,limitUsd:Number(process.env.AI_DAILY_BUDGET_USD||2)}}
