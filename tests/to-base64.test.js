// @ts-check

import { toBase64 } from '../src/utils/image-to-base64'

describe('toBase64', () => {
  test('matches Buffer encoding for empty, small, and >chunk inputs', () => {
    const cases = [
      new Uint8Array([]),
      new Uint8Array([0, 1, 2, 255]),
      new Uint8Array(0x8000 + 13).map((_, i) => i % 256),
    ]
    for (const bytes of cases) {
      expect(toBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'))
    }
  })
})
