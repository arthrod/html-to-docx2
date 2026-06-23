import { describe, it, expect } from 'vitest'
import { sanitizeOmml } from '../src/utils/omml-sanitizer'

describe('OMML Sanitizer', () => {
  it('should preserve valid OMML fragments', () => {
    const omml = '<m:oMath xmlns:m="http://schemas.microsoft.com/office/math/2006/main"><m:r><m:t>x=y</m:t></m:r></m:oMath>'
    expect(sanitizeOmml(omml)).toBe(omml)
  })

  it('should reject strings with DOCTYPE', () => {
    const omml = '<!DOCTYPE m:oMath [<!ENTITY xxe "evil">]><m:oMath><m:t>&xxe;</m:t></m:oMath>'
    expect(sanitizeOmml(omml)).toBe('')
  })

  it('should reject strings with ENTITY', () => {
    const omml = '<!ENTITY xxe "evil"><m:oMath><m:t>&xxe;</m:t></m:oMath>'
    expect(sanitizeOmml(omml)).toBe('')
  })

  it('should strip XML declarations', () => {
    const omml = '<?xml version="1.0" encoding="UTF-8"?><m:oMath><m:t>x</m:t></m:oMath>'
    expect(sanitizeOmml(omml)).toBe('<m:oMath><m:t>x</m:t></m:oMath>')
  })

  it('should strip processing instructions', () => {
    const omml = '<?php echo "evil"; ?><m:oMath><m:t>x</m:t></m:oMath>'
    expect(sanitizeOmml(omml)).toBe('<m:oMath><m:t>x</m:t></m:oMath>')
  })

  it('should handle empty or non-string input', () => {
    expect(sanitizeOmml('')).toBe('')
    expect(sanitizeOmml(null)).toBe('')
    expect(sanitizeOmml(undefined)).toBe('')
  })

  it('should be case-insensitive for dangerous tags', () => {
    const omml = '<!doctype root><m:oMath></m:oMath>'
    expect(sanitizeOmml(omml)).toBe('')
    const omml2 = '<!enTiTy xxe "evil"><m:oMath></m:oMath>'
    expect(sanitizeOmml(omml2)).toBe('')
  })
})
