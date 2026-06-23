/**
 * Sanitizes an OMML (Office Math Markup Language) string to prevent
 * XML External Entity (XXE) injection attacks.
 *
 * This utility removes or rejects dangerous XML constructs like DOCTYPE
 * and ENTITY declarations which are the primary vectors for XXE.
 * It also strips XML declarations and processing instructions.
 */
export const sanitizeOmml = (ommlString: string): string => {
  if (!ommlString || typeof ommlString !== 'string') {
    return ''
  }

  const trimmed = ommlString.trim()

  // Reject input containing DTD declarations (XXE vectors)
  // We check for case-insensitive matches of <!DOCTYPE and <!ENTITY
  if (/<!DOCTYPE/i.test(trimmed) || /<!ENTITY/i.test(trimmed)) {
    return ''
  }

  // Remove XML declarations (e.g., <?xml version="1.0" ?>)
  // and any other processing instructions (e.g., <?php ... ?>)
  const sanitized = trimmed
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<\?[\s\S]*?\?>/gi, '')

  return sanitized.trim()
}

export default sanitizeOmml
