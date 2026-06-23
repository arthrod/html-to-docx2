import { describe, expect, test, beforeEach } from 'bun:test'
import {
  getListTracking,
  setListTracking,
  resetListTracking,
} from './render-document-file'

describe('render-document-file list tracking', () => {
  beforeEach(() => {
    resetListTracking()
  })

  test('getListTracking should return null for unknown list types/levels', () => {
    expect(getListTracking('ol', 0)).toEqual({ lastListNumberingId: null })
  })

  test('setListTracking and getListTracking should work together', () => {
    const testId = 101
    setListTracking('ol', testId, 0)
    expect(getListTracking('ol', 0)).toEqual({ lastListNumberingId: testId })
  })

  test('resetListTracking should clear all saved tracking info', () => {
    setListTracking('ol', 101, 0)
    resetListTracking()
    expect(getListTracking('ol', 0)).toEqual({ lastListNumberingId: null })
  })

  test('should handle multiple indentation levels for the same list type', () => {
    setListTracking('ol', 1, 0)
    setListTracking('ol', 2, 1)

    expect(getListTracking('ol', 0)).toEqual({ lastListNumberingId: 1 })
    expect(getListTracking('ol', 1)).toEqual({ lastListNumberingId: 2 })
  })

  test('should handle multiple list types at the same level', () => {
    setListTracking('ol', 10, 0)
    setListTracking('ul', 20, 0)

    expect(getListTracking('ol', 0)).toEqual({ lastListNumberingId: 10 })
    expect(getListTracking('ul', 0)).toEqual({ lastListNumberingId: 20 })
  })

  test('getListTracking should use default indentLevel = 0', () => {
    setListTracking('ol', 500, 0)
    // Testing the default value of the second parameter
    expect(getListTracking('ol')).toEqual({ lastListNumberingId: 500 })
  })
})
