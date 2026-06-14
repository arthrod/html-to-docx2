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

const isPrivateOrLocalHost = (hostname: string): boolean => {
  const normalized = hostname.toLowerCase()

  if (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '[::1]' ||
    normalized === '0.0.0.0' ||
    normalized === '[::]'
  ) {
    return true
  }

  if (normalized.endsWith('.localhost')) return true

  // IPv6 link-local
  if (/^\[fe[89ab][0-9a-f]:/i.test(normalized)) return true
  // IPv6 unique-local (fc00::/7)
  if (/^\[f[cd][0-9a-f]{2}:/i.test(normalized)) return true

  // IPv4-mapped IPv6 address
  const ipv4MappedMatch = normalized.match(/^\[::ffff:(.+)\]$/)
  if (ipv4MappedMatch) {
    return isPrivateOrLocalHost(ipv4MappedMatch[1])
  }

  let parts: number[] = []
  const stringParts = hostname.split('.')
  if (stringParts.length <= 4 && stringParts.length > 0) {
    parts = stringParts.map((p) => {
      if (p.startsWith('0x') || p.startsWith('0X')) return Number.parseInt(p, 16)
      if (p.startsWith('0') && p.length > 1) return Number.parseInt(p, 8)
      return Number.parseInt(p, 10)
    })
  }

  if (parts.length === 1 && !isNaN(parts[0])) {
    const val = parts[0]
    const octet1 = (val >>> 24) & 255
    const octet2 = (val >>> 16) & 255
    if (octet1 === 127) return true
    if (octet1 === 10) return true
    if (octet1 === 169 && octet2 === 254) return true
    if (octet1 === 192 && octet2 === 168) return true
    if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return true
    if (octet1 === 0) return true
  }

  if (parts.length > 1 && !parts.some(isNaN)) {
    if (parts[0] === 127) return true
    if (parts[0] === 10) return true
    if (parts[0] === 192 && parts[1] === 168) return true
    if (parts[0] === 169 && parts[1] === 254) return true
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
    if (parts[0] === 0) return true
  }

  return false
}

export { isValidUrl, isPrivateOrLocalHost }
