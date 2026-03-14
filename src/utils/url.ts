type SupportedProtocol = 'http:' | 'https:'
const SUPPORTED_PROTOCOLS: ReadonlySet<SupportedProtocol> = new Set(['http:', 'https:'])
const SUPPORTED_IMAGE_PROTOCOLS: ReadonlySet<string> = new Set([
  'http:',
  'https:',
  'data:',
  'blob:',
])

const isPrivateIp = (hostname: string): boolean => {
  if (hostname === 'localhost') return true
  const normalizedHostname = hostname.toLowerCase()

  // IPv6 checks
  if (normalizedHostname === '[::1]') return true
  if (normalizedHostname.startsWith('[fd') || normalizedHostname.startsWith('[fc'))
    return true
  if (normalizedHostname.startsWith('[fe80')) return true
  if (normalizedHostname.includes(':')) {
    // If it's an IPv6 without brackets (can happen in some parsers), or unhandled IPv6, fail safe
    // Note: URL.hostname usually includes brackets for IPv6.
  }

  // IPv4 parsing that handles octal, hex, and decimal variations
  // We use the same algorithm browsers use for IPv4 parsing.
  const parts = normalizedHostname.split('.')
  if (parts.length > 4 || parts.length === 0 || normalizedHostname === '') {
    return false
  }

  let ipNumber = 0
  for (let i = 0; i < parts.length; i++) {
    let part = parts[i]
    if (!part) return false

    let radix = 10
    if (part.startsWith('0x') || part.startsWith('0X')) {
      radix = 16
      part = part.slice(2)
      if (part === '') return false
    } else if (part.length > 1 && part.startsWith('0')) {
      radix = 8
      part = part.slice(1)
    }

    const val = parseInt(part, radix)
    if (isNaN(val)) return false

    if (i === parts.length - 1) {
      if (val >= Math.pow(256, 4 - i)) return false // Exceeds remaining bytes
      ipNumber += val
    } else {
      if (val > 255) return false
      ipNumber += val * Math.pow(256, 3 - i)
    }
  }

  // IP number is now a 32-bit unsigned integer equivalent
  const byte1 = Math.floor(ipNumber / 16777216) % 256
  const byte2 = Math.floor(ipNumber / 65536) % 256

  if (byte1 === 10) return true
  if (byte1 === 127) return true
  if (byte1 === 172 && byte2 >= 16 && byte2 <= 31) return true
  if (byte1 === 192 && byte2 === 168) return true
  if (byte1 === 169 && byte2 === 254) return true

  return false
}

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

  if (urlString.startsWith('data:') || urlString.startsWith('blob:')) {
    return true
  }

  try {
    const url = new URL(urlString)
    if (!SUPPORTED_IMAGE_PROTOCOLS.has(url.protocol)) {
      return false
    }
    if (isPrivateIp(url.hostname)) {
      return false
    }
    return true
  } catch {
    // Relative URLs or invalid URLs
    return !urlString.includes('://') && !urlString.startsWith('file:')
  }
}

export { isValidUrl, isValidImageUrl }
