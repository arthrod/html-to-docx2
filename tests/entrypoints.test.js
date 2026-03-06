import browserDefault, * as browserEntry from '../src/browser'
import nodeDefault, * as nodeEntry from '../src/node'

describe('entrypoint parity', () => {
  test('browser and node entrypoints expose the same named exports', () => {
    const browserKeys = Object.keys(browserEntry).sort()
    const nodeKeys = Object.keys(nodeEntry).sort()

    expect(browserKeys).toEqual(nodeKeys)
  })

  test('browser and node defaults are callable', () => {
    expect(typeof browserDefault).toBe('function')
    expect(typeof nodeDefault).toBe('function')
  })
})
