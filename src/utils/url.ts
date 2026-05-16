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

export const isInternalUrl = (urlString: string): boolean => {
  try {
    const parsedUrl = new URL(urlString)
    const hostname = parsedUrl.hostname

    if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true

    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      const ip = hostname.slice(1, -1).toLowerCase()
      return ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:')
    }

    const parts = hostname.split('.')
    if (parts.length === 4 && parts.every(p => !isNaN(Number(p)))) {
      const a = Number.parseInt(parts[0], 10)
      const b = Number.parseInt(parts[1], 10)
      if (a === 127 || a === 10 || a === 0) return true
      if (a === 172 && b >= 16 && b <= 31) return true
      if (a === 192 && b === 168) return true
      if (a === 169 && b === 254) return true
    }

    return false
  } catch {
    return false
  }
}
export { isValidUrl }
