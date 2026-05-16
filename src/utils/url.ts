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

export const isLocalOrPrivateHost = (hostname: string | null | undefined): boolean => {
  if (!hostname) return false
  const host = hostname.toLowerCase()

  // Basic localhost checks
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === 'localhost.localdomain'
  ) {
    return true
  }

  // IPv6 localhost
  if (host === '[::1]' || host === '::1') {
    return true
  }

  // Node's URL normalizes IPv4 mapped to IPv6 like [::ffff:127.0.0.1] to [::ffff:7f00:1]
  if (
    host.startsWith('[::ffff:7f') || // 127.x.x.x
    host.startsWith('[::ffff:a') || // 10.x.x.x
    host.startsWith('[::ffff:c0a8') || // 192.168.x.x
    host.startsWith('[::ffff:a9fe') || // 169.254.x.x
    host.startsWith('[::ffff:ac') // 172.16.x.x - 172.31.x.x
  ) {
    return true
  }

  // URL constructor normalizes IP representations to dotted decimal
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  const match = host.match(ipv4Regex)

  if (match) {
    const parts = match.slice(1).map(Number)
    if (parts[0] === 127) return true // Loopback
    if (parts[0] === 10) return true // Private
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true // Private
    if (parts[0] === 192 && parts[1] === 168) return true // Private
    if (parts[0] === 169 && parts[1] === 254) return true // Link-local
    if (parts[0] === 0) return true // Current network
  }

  return false
}

export { isValidUrl }
