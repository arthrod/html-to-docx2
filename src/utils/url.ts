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

const SUPPORTED_IMAGE_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:', 'data:', 'blob:'])

const BLOCKED_IPS: ReadonlySet<string> = new Set(['127.0.0.1', 'localhost', '[::1]', '[::]', '0.0.0.0', '::1', '::'])

// Matches decimal IP representation (e.g. 2130706433 for 127.0.0.1)
const DECIMAL_IP_REGEX = /^\d+$/
// Matches hex/octal representations
const HEX_OCTAL_IP_REGEX = /^0[xX][0-9a-fA-F]+|^0[0-7]+$/
// Matches standard dotted decimal IPv4 starting with 127, 10, 192.168, 172.16-31, 169.254, 0
// We ensure it ends with \d+ or matches the full IP, preventing false positives like 10.example.com
const PRIVATE_IPV4_REGEX = /^(127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+|169\.254\.\d+\.\d+|0\.\d+\.\d+\.\d+)$/

const isValidImageUrl = (urlString: string | null | undefined): boolean => {
  if (!urlString || typeof urlString !== 'string') {
    return false
  }

  // Allow relative URLs
  if (urlString.startsWith('/') || urlString.startsWith('./') || urlString.startsWith('../')) {
    return true
  }

  try {
    const url = new URL(urlString)

    // Check supported protocols
    if (!SUPPORTED_IMAGE_PROTOCOLS.has(url.protocol)) {
      return false
    }

    // Network requests require host validation
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      const hostname = url.hostname.toLowerCase()

      // Exact blocks
      if (BLOCKED_IPS.has(hostname)) {
        return false
      }

      // Check decimal/hex/octal representations
      if (DECIMAL_IP_REGEX.test(hostname) || HEX_OCTAL_IP_REGEX.test(hostname)) {
        return false
      }

      // Check private IPv4 ranges
      if (PRIVATE_IPV4_REGEX.test(hostname)) {
        return false
      }
    }

    return true
  } catch {
    // If it can't be parsed as a URL, it might be a valid relative path without a leading slash
    // or an invalid URL altogether. We allow it as a relative path for backward compatibility,
    // as fetch() will handle the error if it's invalid.
    return !urlString.includes('://')
  }
}

export { isValidUrl, isValidImageUrl }
