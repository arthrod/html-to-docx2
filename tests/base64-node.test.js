import { describe, expect, it } from 'vitest'
import {
  base64ToString,
  base64ToBytes,
  bytesToBase64,
  stringToBase64,
} from '../src/utils/base64-node'

describe('base64-node (Buffer-based)', () => {
  it('encodes bytes to base64', () => {
    const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f])
    expect(bytesToBase64(bytes)).toBe('SGVsbG8=')
  })

  it('decodes base64 to bytes', () => {
    const result = base64ToBytes('SGVsbG8=')
    expect(result).toBeInstanceOf(Buffer)
    expect(Array.from(result)).toEqual([0x48, 0x65, 0x6c, 0x6c, 0x6f])
  })

  it('encodes string to base64', () => {
    expect(stringToBase64('Hello')).toBe('SGVsbG8=')
  })

  it('decodes base64 to string', () => {
    expect(base64ToString('SGVsbG8=')).toBe('Hello')
  })

  it('round-trips binary data', () => {
    const original = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00])
    const encoded = bytesToBase64(original)
    const decoded = base64ToBytes(encoded)
    expect(Array.from(decoded)).toEqual(Array.from(original))
  })

  it('round-trips unicode strings', () => {
    const text = 'Olá mundo! 日本語テスト'
    expect(base64ToString(stringToBase64(text))).toBe(text)
  })

  it('handles empty input', () => {
    expect(bytesToBase64(new Uint8Array([]))).toBe('')
    expect(Array.from(base64ToBytes(''))).toEqual([])
    expect(stringToBase64('')).toBe('')
    expect(base64ToString(stringToBase64(''))).toBe('')
  })
})
