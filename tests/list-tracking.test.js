// @ts-check

import {
  getListTracking,
  resetListTracking,
  setListTracking,
} from '../src/helpers/render-document-file'

describe('list tracking', () => {
  beforeEach(() => {
    resetListTracking()
  })

  test('returns null numbering when nothing is stored', () => {
    expect(getListTracking('ol', 0)).toEqual({ lastListNumberingId: null })
  })

  test('round-trips a stored numbering id at a given indent', () => {
    setListTracking('ol', 42, 1)
    expect(getListTracking('ol', 1)).toEqual({ lastListNumberingId: 42 })
    expect(getListTracking('ol', 0)).toEqual({ lastListNumberingId: null })
    expect(getListTracking('ul', 1)).toEqual({ lastListNumberingId: null })
  })

  test('defaults indentLevel to 0 on get and set', () => {
    setListTracking('ol', 500)
    expect(getListTracking('ol')).toEqual({ lastListNumberingId: 500 })
  })

  test('resetListTracking clears every stored key', () => {
    setListTracking('ol', 101, 0)
    setListTracking('ul', 202, 2)
    resetListTracking()
    expect(getListTracking('ol', 0)).toEqual({ lastListNumberingId: null })
    expect(getListTracking('ul', 2)).toEqual({ lastListNumberingId: null })
  })
})
