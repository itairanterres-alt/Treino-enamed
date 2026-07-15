import{describe,expect,it}from'vitest';
import{benchmarkAgainstEnamed2025}from'./enamed-benchmark.js';

const alternatives=['A','B','C','D'].map(text=>({text:`Conduta clínica ${text} devidamente especificada.`}));
describe('benchmark estrutural ENAMED',()=>{
 it('aceita item dentro do envelope empírico',()=>{
  const stem=Array.from({length:50},(_,i)=>`palavra${i}`).join(' ');
  expect(benchmarkAgainstEnamed2025({stem,alternatives}).issues).toEqual([]);
 });
 it('sinaliza item curto sem fingir validar o mérito médico',()=>{
  const result=benchmarkAgainstEnamed2025({stem:'Caso curto sem contexto clínico suficiente.',alternatives});
  expect(result.issues).toHaveLength(2);
  expect(result.reference).toContain('90 itens válidos');
 });
});
