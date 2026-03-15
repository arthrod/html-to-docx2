type SupportedProtocol = 'http:' | 'https:' | 'data:' | 'blob:'
const SUPPORTED_PROTOCOLS: ReadonlySet<SupportedProtocol> = new Set([
  'http:',
  'https:',
  'data:',
  'blob:',
])

const isValidUrl = (urlString: string | null | undefined): boolean => {
  if (!urlString || typeof urlString !== 'string') {
    return false
  }

  try {
    const url = new URL(urlString)
    return SUPPORTED_PROTOCOLS.has(url.protocol as SupportedProtocol)
  } catch {
    return false
  }
}

/**
 * Validates an image URL to prevent SSRF and LFI vulnerabilities.
 * Allows http, https, data, and blob protocols.
 * Allows relative URLs, but explicitly blocks protocol-relative URLs
 * (e.g., //example.com) to prevent bypassing protocol restrictions.
 */
export const isValidImageUrl = (urlString: string | null | undefined): boolean => {
  if (!urlString || typeof urlString !== 'string') {
    return false
  }

  // Block protocol-relative URLs explicitly
  if (urlString.startsWith('//')) {
    return false
  }

  try {
    const url = new URL(urlString)
    return SUPPORTED_PROTOCOLS.has(url.protocol as SupportedProtocol)
  } catch {
    // If new URL() throws, it might be a relative URL.
    if (
      urlString.startsWith('/') ||
      urlString.startsWith('./') ||
      urlString.startsWith('../')
    ) {
      return true
    }
    // If it doesn't have a protocol scheme, assume it's relative
    if (!/^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(urlString)) {
      return true
    }
    return false
  }
}

export { isValidUrl }
