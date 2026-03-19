const fs = require('node:fs')

const content = fs.readFileSync('src/utils/url.ts', 'utf8')

const newContent = `type SupportedProtocol = 'http:' | 'https:'
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

/**
 * Validates an image URL to prevent Server-Side Request Forgery (SSRF) and Local File Inclusion (LFI).
 * Whitelists http:, https:, data:, and blob: protocols.
 * Blocks requests to private IP ranges and localhost for absolute URLs.
 * Safely permits relative URLs.
 */
const isValidImageUrl = (urlString: string | null | undefined): boolean => {
  if (!urlString || typeof urlString !== 'string') {
    return false
  }

  // Allow data: and blob: URIs directly
  if (urlString.startsWith('data:') || urlString.startsWith('blob:')) {
    return true
  }

  try {
    // Attempt to parse as an absolute URL
    const url = new URL(urlString)

    // Only allow http and https
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false
    }

    // SSRF Protection: Block internal/private IPs and localhost
    const hostname = url.hostname

    // Block localhost
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
      return false
    }

    // Block IPv4 loopback, private, and link-local addresses
    // URL parser normalizes octal/decimal IPs to standard dotted decimal
    const ipv4Pattern = /^(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})$/
    const match = hostname.match(ipv4Pattern)

    if (match) {
      const octet1 = parseInt(match[1], 10)
      const octet2 = parseInt(match[2], 10)

      // 127.0.0.0/8 (Loopback)
      if (octet1 === 127) return false
      // 10.0.0.0/8 (Private)
      if (octet1 === 10) return false
      // 172.16.0.0/12 (Private)
      if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return false
      // 192.168.0.0/16 (Private)
      if (octet1 === 192 && octet2 === 168) return false
      // 169.254.0.0/16 (Link-local)
      if (octet1 === 169 && octet2 === 254) return false
      // 0.0.0.0/8 ("This" network)
      if (octet1 === 0) return false
    }

    // Block IPv6 loopback, private, and link-local addresses
    // Using simple substring matching for normalized IPv6
    if (hostname === '[::1]') return false
    if (hostname.startsWith('[fc') || hostname.startsWith('[fd')) return false // fc00::/7 Unique Local Address
    if (hostname.startsWith('[fe8') || hostname.startsWith('[fe9') ||
        hostname.startsWith('[fea') || hostname.startsWith('[feb')) return false // fe80::/10 Link-local Address

    return true
  } catch {
    // If new URL() throws, it's not a valid absolute URL.
    // Allow it if it looks like a relative path, but reject protocol-relative (//)
    if (urlString.startsWith('//')) {
      return false
    }

    // Check if it's a valid relative path by providing a dummy base
    try {
      new URL(urlString, 'http://dummybase.com')
      return true
    } catch {
      return false
    }
  }
}

export { isValidUrl, isValidImageUrl }
`

fs.writeFileSync('src/utils/url.ts', newContent)
