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

export const isForbiddenHostname = (hostname: string): boolean => {
  const lowerHost = hostname.toLowerCase()
  if (lowerHost === 'localhost') return true

  const ip4Regexes = [
    /^127\.\d+\.\d+\.\d+$/,
    /^10\.\d+\.\d+\.\d+$/,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+$/,
    /^192\.168\.\d+\.\d+$/,
    /^169\.254\.\d+\.\d+$/,
    /^0\.0\.0\.0$/,
  ]

  if (ip4Regexes.some((r) => r.test(lowerHost))) return true

  if (
    lowerHost === '[::1]' ||
    lowerHost === '[::]' ||
    lowerHost.startsWith('[fc') ||
    lowerHost.startsWith('[fd') ||
    lowerHost.startsWith('[fe80')
  ) {
    return true
  }

  return false
}

export const validateFetchUrl = (url: string): void => {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(String(url).trim())
  } catch {
    parsedUrl = new URL(String(url).trim(), 'http://dummy.base')
  }

  const protocol = parsedUrl.protocol
  if (!['http:', 'https:', 'data:', 'blob:'].includes(protocol)) {
    throw new Error('Invalid URL')
  }

  if (protocol === 'http:' || protocol === 'https:') {
    if (isForbiddenHostname(parsedUrl.hostname)) {
      throw new Error('Invalid URL')
    }
  }
}

export { isValidUrl }
