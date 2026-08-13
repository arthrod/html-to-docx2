export type OmmlValidation = {
  valid: boolean
  reason?: string
}

const MATH_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/math'

/**
 * Rejects OMML strings that must never reach xmlbuilder2.
 *
 * xmlbuilder2 has no public DTD-disable switch, so this is the parser-facing
 * gate. Callers must skip `fragment().ele(omml)` when `valid` is false.
 */
export const validateOMMLString = (ommlString: unknown): OmmlValidation => {
  if (!ommlString || typeof ommlString !== 'string') {
    return { valid: false, reason: 'empty' }
  }

  if (/<!/.test(ommlString)) {
    return { valid: false, reason: 'markup-declaration' }
  }

  if (/<\?/.test(ommlString)) {
    return { valid: false, reason: 'processing-instruction' }
  }

  if (/<\/?script\b/i.test(ommlString)) {
    return { valid: false, reason: 'script' }
  }

  const hasPrefixedMath = /<m:[a-zA-Z][\w.-]*/.test(ommlString)
  const hasMathNamespace = ommlString.includes(MATH_NS)
  if (!hasPrefixedMath && !hasMathNamespace) {
    return { valid: false, reason: 'not-omml' }
  }

  return { valid: true }
}

export default validateOMMLString
