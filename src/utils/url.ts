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
  const h = hostname.toLowerCase()
  if (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '[::1]' ||
    h === '::1' ||
    h === '0.0.0.0' ||
    h === '::' ||
    h === '[::]'
  ) {
    return true
  }

  if (h.endsWith('.localhost')) return true

  // IPv6 checks
  if (h.includes(':')) {
    const inner = (h.startsWith('[') && h.endsWith(']')) ? h.slice(1, -1) : h
    if (inner === '::1' || inner === '::' || inner === '0.0.0.0') return true
    if (inner.startsWith('fe8') || inner.startsWith('fe9') || inner.startsWith('fea') || inner.startsWith('feb')) return true // fe80::/10
    if (inner.startsWith('fc') || inner.startsWith('fd')) return true // fc00::/7
    if (inner.startsWith('::ffff:')) {
      const ipv4Part = inner.split(':').pop()
      if (ipv4Part && isPrivateOrLocalHost(ipv4Part)) return true
    }
    return false // If it's IPv6 and didn't match private ranges, it's public
  }

  // IPv4 checks
  let parts: number[] = []
  const stringParts = h.split('.')
  if (stringParts.length <= 4 && stringParts.length > 0) {
    // Check if it's actually numeric
    const isNumeric = stringParts.every(p => /^(0x[0-9a-f]+|0[0-7]*|[0-9]+)$/i.test(p))
    if (isNumeric) {
      parts = stringParts.map((p) => {
        if (p.startsWith('0x') || p.startsWith('0X')) return Number.parseInt(p, 16)
        if (p.startsWith('0') && p.length > 1) return Number.parseInt(p, 8)
        return Number.parseInt(p, 10)
      })
    }
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

/**
 * Validates if a hostname is safe to fetch (not private/local and doesn't resolve to such).
 * In Node.js environment, it performs DNS resolution.
 */
const isSafeHostname = async (hostname: string): Promise<boolean> => {
  if (isPrivateOrLocalHost(hostname)) {
    return false
  }

  if (typeof Buffer !== 'undefined') {
    try {
      const dns = await import('node:dns/promises')
      const addresses = await dns.lookup(hostname, { all: true })
      for (const addr of addresses) {
        if (isPrivateOrLocalHost(addr.address)) {
          return false
        }
      }
    } catch {
      // If DNS lookup fails, we treat it as unsafe for SSRF protection
      return false
    }
  }

  return true
}

export { isValidUrl, isPrivateOrLocalHost, isSafeHostname }
