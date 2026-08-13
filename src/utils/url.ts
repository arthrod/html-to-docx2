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

const isPrivateIPv4Octets = (parts: number[]): boolean => {
  if (parts.length === 1 && !Number.isNaN(parts[0])) {
    const val = parts[0]
    const octet1 = (val >>> 24) & 255
    const octet2 = (val >>> 16) & 255
    if (octet1 === 127) return true
    if (octet1 === 10) return true
    if (octet1 === 169 && octet2 === 254) return true
    if (octet1 === 192 && octet2 === 168) return true
    if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return true
    if (octet1 === 0) return true
    return false
  }

  if (parts.length > 1 && !parts.some(Number.isNaN)) {
    if (parts[0] === 127) return true
    if (parts[0] === 10) return true
    if (parts[0] === 192 && parts[1] === 168) return true
    if (parts[0] === 169 && parts[1] === 254) return true
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
    if (parts[0] === 0) return true
  }

  return false
}

const ipv4FromMappedHextets = (high: string, low: string): string | null => {
  const p1 = Number.parseInt(high, 16)
  const p2 = Number.parseInt(low, 16)
  if (Number.isNaN(p1) || Number.isNaN(p2)) return null
  return `${(p1 >> 8) & 255}.${p1 & 255}.${(p2 >> 8) & 255}.${p2 & 255}`
}

const mappedIPv4FromIPv6 = (inner: string): string | null => {
  const dotted = inner.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i)
  if (dotted) return dotted[1]
  const hexMapped = inner.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i)
  if (!hexMapped) return null
  return ipv4FromMappedHextets(hexMapped[1], hexMapped[2])
}

const isPrivateIPv6 = (inner: string): boolean => {
  if (
    inner === '::1' ||
    inner === '::' ||
    inner === '0:0:0:0:0:0:0:1' ||
    inner === '0:0:0:0:0:0:0:0'
  ) {
    return true
  }

  const firstGroup = inner.split(':').find((part) => part.length > 0) || ''
  const firstHex = Number.parseInt(firstGroup, 16)
  if (Number.isNaN(firstHex)) return false
  if ((firstHex & 0xfe00) === 0xfc00) return true
  if ((firstHex & 0xffc0) === 0xfe80) return true
  return false
}

const isPrivateOrLocalHost = (hostname: string): boolean => {
  let normalized = hostname.trim().toLowerCase().replace(/\.+$/, '')

  if (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '[::1]' ||
    normalized === '::1' ||
    normalized === '0.0.0.0' ||
    normalized === '[::]' ||
    normalized === '::'
  ) {
    return true
  }

  if (normalized.endsWith('.localhost')) return true

  if (normalized.includes(':')) {
    const inner =
      normalized.startsWith('[') && normalized.endsWith(']')
        ? normalized.slice(1, -1)
        : normalized
    const mappedV4 = mappedIPv4FromIPv6(inner)
    if (mappedV4) {
      normalized = mappedV4
    } else {
      return isPrivateIPv6(inner)
    }
  }

  let parts: number[] = []
  const stringParts = normalized.split('.')
  if (stringParts.length <= 4 && stringParts.length > 0) {
    parts = stringParts.map((p) => {
      if (p.startsWith('0x') || p.startsWith('0X')) return Number.parseInt(p, 16)
      if (p.startsWith('0') && p.length > 1) return Number.parseInt(p, 8)
      return Number.parseInt(p, 10)
    })
  }

  return isPrivateIPv4Octets(parts)
}

export { isValidUrl, isPrivateOrLocalHost }
