import { describe, expect, it, beforeEach } from 'bun:test'

import { resetListTracking, getListTracking, setListTracking } from './render-document-file'

describe('List Tracking Functions', () => {
  beforeEach(() => {
    resetListTracking()
  })

  describe('resetListTracking', () => {
    it('should clear listNumberingByLevel and reset state variables', () => {
      setListTracking('decimal', 5, 1)
      expect(getListTracking('decimal', 1).lastListNumberingId).toBe(5)

      resetListTracking()

      expect(getListTracking('decimal', 1).lastListNumberingId).toBeNull()
      // Note: We can't directly check _lastListType or _lastIndentLevel because they are not exported,
      // but they are implicitly tested as their state doesn't leak into getListTracking.
    })
  })

  describe('getListTracking', () => {
    it('should return null if list type and indent level combination has not been set', () => {
      expect(getListTracking('disc', 0).lastListNumberingId).toBeNull()
    })

    it('should return the correct lastListNumberingId when set', () => {
      setListTracking('disc', 10, 0)
      expect(getListTracking('disc', 0).lastListNumberingId).toBe(10)
    })

    it('should distinguish between different list types at the same indent level', () => {
      setListTracking('disc', 10, 0)
      setListTracking('decimal', 20, 0)

      expect(getListTracking('disc', 0).lastListNumberingId).toBe(10)
      expect(getListTracking('decimal', 0).lastListNumberingId).toBe(20)
    })

    it('should distinguish between the same list type at different indent levels', () => {
      setListTracking('disc', 10, 0)
      setListTracking('disc', 15, 1)

      expect(getListTracking('disc', 0).lastListNumberingId).toBe(10)
      expect(getListTracking('disc', 1).lastListNumberingId).toBe(15)
    })

    it('should default indentLevel to 0 if not provided', () => {
      setListTracking('disc', 10)
      expect(getListTracking('disc').lastListNumberingId).toBe(10)
    })
  })

  describe('setListTracking', () => {
    it('should update the list numbering ID for a given list type and indent level', () => {
      setListTracking('disc', 10, 0)
      expect(getListTracking('disc', 0).lastListNumberingId).toBe(10)

      setListTracking('disc', 12, 0)
      expect(getListTracking('disc', 0).lastListNumberingId).toBe(12)
    })
  })
})
