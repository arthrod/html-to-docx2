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

export const isSSRFSafeURL = (urlStr: string): boolean => {
  let parsed: URL
  try {
    parsed = new URL(urlStr.trim())
  } catch {
    return false // Cannot parse as absolute URL
  }

  // Only check HTTP and HTTPS for SSRF
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return true
  }

  const hostname = parsed.hostname.toLowerCase()

  // Block localhost and common internal hostnames
  if (
    hostname === 'localhost' ||
    hostname.includes('.internal') ||
    hostname.includes('.local') ||
    hostname === 'kubernetes.default.svc' ||
    hostname === 'host.docker.internal' ||
    hostname.endsWith('.arpa')
  ) {
    return false
  }

  // Block common metadata endpoints and bypasses like nip.io
  if (
    hostname.includes('169.254.169.254') ||
    hostname.includes('nip.io') ||
    hostname.includes('127.0.0.1')
  ) {
    return false
  }

  // Regex to block IPv4 private, loopback, link-local, multicast, etc.
  const ipv4Regex =
    /^(?:127\.|10\.|192\.168\.|169\.254\.|0\.|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|172\.(?:1[6-9]|2\d|3[0-1])\.|192\.0\.2\.|198\.51\.100\.|203\.0\.113\.|192\.0\.0\.|198\.(?:1[89])\.|22[4-9]\.|23\d\.|24\d\.|25[0-5]\.)/
  if (ipv4Regex.test(hostname)) {
    return false
  }

  // Regex to block IPv6 localhost, loopback, link-local, unique local
  const ipv6Regex = /^\[?(?:0*:)*0*1\]?$|^\[?(?:0*:)*0*0\]?$|^\[?[fF][cCdD]|^\[?[fF][eE][89aAbB]/
  if (ipv6Regex.test(hostname)) {
    return false
  }

  return true
}

export { isValidUrl }
