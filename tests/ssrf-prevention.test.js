import { describe, test, expect, vi } from 'vitest'
import { isPrivateOrLocalHost, isSafeHostname } from '../src/utils/url'

describe('SSRF Prevention - isPrivateOrLocalHost', () => {
  test('should detect local IPv4 addresses', () => {
    expect(isPrivateOrLocalHost('127.0.0.1')).toBe(true)
    expect(isPrivateOrLocalHost('127.0.0.2')).toBe(true)
    expect(isPrivateOrLocalHost('0.0.0.0')).toBe(true)
    expect(isPrivateOrLocalHost('localhost')).toBe(true)
    expect(isPrivateOrLocalHost('dev.localhost')).toBe(true)
  })

  test('should detect private IPv4 ranges', () => {
    expect(isPrivateOrLocalHost('10.0.0.1')).toBe(true)
    expect(isPrivateOrLocalHost('172.16.0.1')).toBe(true)
    expect(isPrivateOrLocalHost('172.31.255.255')).toBe(true)
    expect(isPrivateOrLocalHost('192.168.1.1')).toBe(true)
    expect(isPrivateOrLocalHost('169.254.169.254')).toBe(true)
  })

  test('should detect local and private IPv6 addresses', () => {
    expect(isPrivateOrLocalHost('::1')).toBe(true)
    expect(isPrivateOrLocalHost('[::1]')).toBe(true)
    expect(isPrivateOrLocalHost('::')).toBe(true)
    expect(isPrivateOrLocalHost('[::]')).toBe(true)
    expect(isPrivateOrLocalHost('fe80::1')).toBe(true)
    expect(isPrivateOrLocalHost('[fe80::1]')).toBe(true)
    expect(isPrivateOrLocalHost('fc00::1')).toBe(true)
    expect(isPrivateOrLocalHost('[fc00::1]')).toBe(true)
  })

  test('should detect IPv4-mapped IPv6 addresses', () => {
    expect(isPrivateOrLocalHost('::ffff:127.0.0.1')).toBe(true)
    expect(isPrivateOrLocalHost('[::ffff:127.0.0.1]')).toBe(true)
    expect(isPrivateOrLocalHost('::ffff:10.0.0.1')).toBe(true)
    expect(isPrivateOrLocalHost('[::ffff:192.168.1.1]')).toBe(true)
  })

  test('should detect encoded IPv4 addresses (hex, octal, decimal)', () => {
    expect(isPrivateOrLocalHost('0x7f000001')).toBe(true) // 127.0.0.1 in hex
    expect(isPrivateOrLocalHost('0177.0000.0000.0001')).toBe(true) // 127.0.0.1 in octal
    expect(isPrivateOrLocalHost('2130706433')).toBe(true) // 127.0.0.1 in decimal
  })

  test('should allow public hostnames', () => {
    expect(isPrivateOrLocalHost('google.com')).toBe(false)
    expect(isPrivateOrLocalHost('8.8.8.8')).toBe(false)
    expect(isPrivateOrLocalHost('2001:4860:4860::8888')).toBe(false)
  })
})

describe('SSRF Prevention - isSafeHostname', () => {
  test('should block hostnames that resolve to private IPs', async () => {
    const dns = await import('node:dns/promises')
    const spy = vi.spyOn(dns, 'lookup').mockResolvedValue([
      { address: '127.0.0.1', family: 4 }
    ])

    const result = await isSafeHostname('malicious.com')
    expect(result).toBe(false)
    expect(spy).toHaveBeenCalledWith('malicious.com', { all: true })

    spy.mockRestore()
  })

  test('should allow hostnames that resolve to public IPs', async () => {
    const dns = await import('node:dns/promises')
    const spy = vi.spyOn(dns, 'lookup').mockResolvedValue([
      { address: '8.8.8.8', family: 4 }
    ])

    const result = await isSafeHostname('google.com')
    expect(result).toBe(true)

    spy.mockRestore()
  })

  test('should block if any resolved IP is private', async () => {
    const dns = await import('node:dns/promises')
    const spy = vi.spyOn(dns, 'lookup').mockResolvedValue([
      { address: '8.8.8.8', family: 4 },
      { address: '10.0.0.1', family: 4 }
    ])

    const result = await isSafeHostname('mixed.com')
    expect(result).toBe(false)

    spy.mockRestore()
  })

  test('should block if DNS resolution fails', async () => {
    const dns = await import('node:dns/promises')
    const spy = vi.spyOn(dns, 'lookup').mockRejectedValue(new Error('DNS Error'))

    const result = await isSafeHostname('nonexistent.example')
    expect(result).toBe(false)

    spy.mockRestore()
  })
})
