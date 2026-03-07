// @ts-check
import browserDefault, * as browserEntry from '../src/browser'
import nodeDefault, * as nodeEntry from '../src/node'
import rootDefault, * as rootEntry from '../index'
import srcDefault, * as srcEntry from '../src/index'
import * as indexBaseEntry from '../src/index-base'

/**
 * @param {object} value
 * @returns {string[]}
 */
function sortedKeys(value) {
  return Object.keys(value).toSorted()
}

describe('entrypoint parity', () => {
  test('browser and node entrypoints expose the same named exports', () => {
    const browserKeys = sortedKeys(browserEntry)
    const nodeKeys = sortedKeys(nodeEntry)

    expect(browserKeys).toEqual(nodeKeys)
  })

  test('browser and node defaults are callable', () => {
    expect(typeof browserDefault).toBe('function')
    expect(typeof nodeDefault).toBe('function')
  })

  test('root and src index entrypoints expose identical export keys', () => {
    const rootKeys = sortedKeys(rootEntry)
    const srcKeys = sortedKeys(srcEntry)

    expect(rootKeys).toEqual(srcKeys)
  })

  test('root and src defaults map to callable converters', () => {
    expect(typeof rootDefault).toBe('function')
    expect(typeof srcDefault).toBe('function')
    expect(rootEntry.HTMLtoDOCX).toBe(rootDefault)
    expect(srcEntry.HTMLtoDOCX).toBe(srcDefault)
  })

  test('index-base re-exports namespaces and tracking utilities', () => {
    expect(typeof indexBaseEntry.namespaces).toBe('object')
    expect(typeof indexBaseEntry.namespaces.w).toBe('string')
    expect(typeof indexBaseEntry.hasTrackingTokens).toBe('function')
    expect(indexBaseEntry.hasTrackingTokens('plain text')).toBe(false)
  })
})
