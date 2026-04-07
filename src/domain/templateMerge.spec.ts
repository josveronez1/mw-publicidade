import { describe, expect, it } from 'vitest'
import {
  extractPlaceholderKeys,
  mergeTemplatePlaceholders,
  validateRequiredPlaceholders,
} from './templateMerge'

describe('templateMerge', () => {
  it('extracts keys', () => {
    expect(
      extractPlaceholderKeys('Olá {{nome}}, valor {{valor_mensal}}.'),
    ).toEqual(['nome', 'valor_mensal'])
  })

  it('merges values', () => {
    expect(
      mergeTemplatePlaceholders('{{a}} + {{b}}', { a: '1', b: '2' }),
    ).toBe('1 + 2')
  })

  it('validates required', () => {
    const r = validateRequiredPlaceholders(
      '{{x}}',
      ['x', 'y'],
      { x: 'ok', y: '' },
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.missing).toContain('y')
  })
})
