/**
 * OMML Sanitizer - security-focused validator for Office Math Markup Language (OMML) content.
 */

/**
 * Validates an OMML string for security risks and basic structure.
 *
 * @param ommlString The OMML string to validate
 * @returns true if the string is considered safe and valid OMML, false otherwise
 */
export const validateOMMLString = (ommlString: string): boolean => {
  if (!ommlString || typeof ommlString !== 'string') {
    return false
  }

  // 1. Check for DOCTYPE declarations (XXE prevention)
  if (/<!DOCTYPE/i.test(ommlString)) {
    return false
  }

  // 2. Check for ENTITY declarations (XXE prevention)
  if (/<!ENTITY/i.test(ommlString)) {
    return false
  }

  // 3. Check for script tags (XSS prevention)
  if (/<script[\s>]/i.test(ommlString)) {
    return false
  }

  // 4. Check for XML processing instructions
  if (/<\?xml/i.test(ommlString)) {
    return false
  }

  // 5. Check for CDATA sections which can be used to hide malicious payloads
  if (/<!\[CDATA\[/i.test(ommlString)) {
    return false
  }

  // 6. Basic OMML structure check - should contain m: namespace elements
  // Most OMML equations use the m: namespace prefix
  if (!/<m:[a-zA-Z0-9]+/.test(ommlString)) {
    return false
  }

  return true
}

export default validateOMMLString
