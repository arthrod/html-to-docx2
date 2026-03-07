// @ts-check

import { afterEach, describe, expect, test, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('xmlbuilder2/lib/xmlbuilder2.min.js')
})

describe('xmlbuilder2 namespace guards', () => {
  test('throws when namespace import shape is invalid', async () => {
    vi.resetModules()
    vi.doMock('xmlbuilder2/lib/xmlbuilder2.min.js', () => ({}))

    await expect(import('../src/utils/xmlbuilder2')).rejects.toThrow(
      'Failed to resolve xmlbuilder2 namespace import'
    )
  })

  test('throws when required factory functions are missing', async () => {
    vi.resetModules()
    vi.doMock('xmlbuilder2/lib/xmlbuilder2.min.js', () => ({
      default: {
        builder: () => null,
      },
    }))

    await expect(import('../src/utils/xmlbuilder2')).rejects.toThrow(
      'xmlbuilder2 import is missing required factory functions'
    )
  })
})
