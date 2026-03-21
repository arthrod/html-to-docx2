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

const ALLOWED_IMAGE_PROTOCOLS: ReadonlySet<string> = new Set([
  'http:',
  'https:',
  'data:',
  'blob:',
])

const isPrivateIP = (hostname: string): boolean => {
  if (hostname === 'localhost' || hostname === '[::]' || hostname === '[::1]') return true

  // Handle octal/hex notation bypasses by relying on URL parser's hostname resolution.
  // The URL parser in Node/Bun resolves variations like http://2130706433/ to 127.0.0.1
  const parts = hostname.split('.')
  if (parts.length === 4) {
    const p1 = Number.parseInt(parts[0], 10)
    const p2 = Number.parseInt(parts[1], 10)
    if (
      p1 === 127 ||
      p1 === 10 ||
      (p1 === 169 && p2 === 254) ||
      (p1 === 192 && p2 === 168) ||
      (p1 === 172 && p2 >= 16 && p2 <= 31)
    ) {
      return true
    }
  }

  return false
}

const isValidImageUrl = (urlString: string | null | undefined): boolean => {
  if (!urlString || typeof urlString !== 'string') {
    return false
  }

  try {
    const isAbsolute = /^[a-z][a-z0-9+.-]*:/i.test(urlString)
    if (!isAbsolute) {
      return true
    }

    const url = new URL(urlString)
    if (!ALLOWED_IMAGE_PROTOCOLS.has(url.protocol)) {
      return false
    }

    if (url.protocol === 'http:' || url.protocol === 'https:') {
      if (isPrivateIP(url.hostname)) {
        return false
      }
    }

    return true
  } catch {
    return false
  }
}

export { isValidUrl, isValidImageUrl }
