import {describe,expect,it} from 'vitest';
import {statusesForMode} from './useQuestionBank';

describe('visibilidade editorial no treino',()=>{
 it('inclui itens humanos e automáticos que passaram pelos gates',()=>expect(statusesForMode('all_verified')).toEqual(['human_reviewed','auto_verified']));
 it('permite ao aluno filtrar somente revisão humana',()=>expect(statusesForMode('reviewed_only')).toEqual(['human_reviewed']));
});
