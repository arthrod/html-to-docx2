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
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '0.0.0.0'
  ) {
    return true
  }

  if (hostname.endsWith('.localhost')) return true

  if (hostname === '[::]') return true

  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    const inner = hostname.slice(1, -1).toLowerCase()
    if (inner === '::1' || inner === '::') return true

    const isMapped = inner.startsWith('::ffff:') || inner.startsWith('0:0:0:0:0:ffff:')
    if (isMapped) {
      const lastPart = inner.split(':').pop() || ''
      if (lastPart.includes('.')) {
        hostname = lastPart
      } else {
        const match = inner.match(/^(?:::ffff:|0:0:0:0:0:ffff:)([0-9a-f]+):([0-9a-f]+)$/)
        if (match) {
          const p1 = parseInt(match[1], 16)
          const p2 = parseInt(match[2], 16)
          hostname = `${(p1 >> 8) & 255}.${p1 & 255}.${(p2 >> 8) & 255}.${p2 & 255}`
        }
      }
    } else {
      const firstHexStr = inner.split(':')[0]
      if (firstHexStr) {
        const firstHex = parseInt(firstHexStr, 16)
        if (!isNaN(firstHex)) {
          if ((firstHex & 0xfe00) === 0xfc00) return true
          if ((firstHex & 0xffc0) === 0xfe80) return true
        }
      }
    }
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
