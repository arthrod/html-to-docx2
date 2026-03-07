// @ts-check
import browserDefault, * as browserEntry from '../src/browser'
import nodeDefault, * as nodeEntry from '../src/node'

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
})
