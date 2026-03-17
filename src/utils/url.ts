type SupportedProtocol = 'http:' | 'https:'
const SUPPORTED_PROTOCOLS: ReadonlySet<SupportedProtocol> = new Set(['http:', 'https:'])

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

const isValidImageUrl = (urlString: string | null | undefined): boolean => {
  if (!urlString || typeof urlString !== 'string') {
    return false
  }

  try {
    const url = new URL(urlString)

    // Allowed protocols for image downloading
    if (
      SUPPORTED_PROTOCOLS.has(url.protocol as SupportedProtocol) ||
      url.protocol === 'data:' ||
      url.protocol === 'blob:'
    ) {
      return true
    }

    return false
  } catch {
    // If it's not a valid absolute URL, it's a relative path.
    // Ensure it doesn't try to sneak in a dangerous protocol like 'file:'
    // (e.g., bypassing new URL parse due to malformed string, though new URL usually catches it)
    const normalized = urlString.trim().toLowerCase()
    if (
      normalized.startsWith('file:') ||
      normalized.startsWith('php:') ||
      normalized.startsWith('gopher:') ||
      normalized.startsWith('expect:') ||
      normalized.startsWith('dict:')
    ) {
      return false
    }

    return true // Allow relative URLs (will likely fail fetch without base, but safe from LFI)
  }
}

export { isValidUrl, isValidImageUrl }
