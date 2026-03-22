type SupportedProtocol = 'http:' | 'https:'
const SUPPORTED_PROTOCOLS: ReadonlySet<SupportedProtocol> = new Set(['http:', 'https:'])

const IMAGE_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:', 'data:', 'blob:'])

const LOCAL_HOSTNAMES: ReadonlySet<string> = new Set([
  'localhost',
  '[::1]',
  '[::]',
  '[0:0:0:0:0:0:0:1]',
  '[0:0:0:0:0:0:0:0]',
])

const LOCAL_IPV4_REGEX =
  /^(127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)$/

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
    // We use a base URL so relative URLs are safely parsed.
    // If the URL is relative, the protocol will be 'http:',
    // and hostname will be 'dummy.local'.
    const url = new URL(urlString, 'http://dummy.local')

    // Check allowed protocols for images
    if (!IMAGE_PROTOCOLS.has(url.protocol)) {
      return false
    }

    if (url.protocol === 'http:' || url.protocol === 'https:') {
      const hostname = url.hostname.toLowerCase()

      // Permit the dummy hostname for relative URLs
      if (hostname === 'dummy.local') {
        return true
      }

      // Block SSRF to common local/private hostnames
      if (LOCAL_HOSTNAMES.has(hostname)) {
        return false
      }

      // Block SSRF to local/private IPv4 ranges
      // Note: Node/Bun URL parser normalizes alternative IP formats (like 2130706433 -> 127.0.0.1)
      if (LOCAL_IPV4_REGEX.test(hostname)) {
        return false
      }
    }

    return true
  } catch {
    return false
  }
}

export { isValidUrl, isValidImageUrl }
