import { describe, expect, it } from 'vitest';
import { questions } from './data';

describe('banco demonstrativo', () => {
  it('mantém exatamente quatro alternativas e um gabarito válido', () => {
    for (const question of questions) {
      expect(question.alternatives).toHaveLength(4);
      expect(question.alternatives.map(a => a.id)).toEqual(['A', 'B', 'C', 'D']);
      expect(question.alternatives.some(a => a.id === question.correct)).toBe(true);
      expect(question.alternatives.every(a => a.rationale.trim().length > 0)).toBe(true);
    }
  });
});
