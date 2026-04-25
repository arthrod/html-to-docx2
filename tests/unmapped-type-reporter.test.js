// @ts-check
import { describe, expect, test, vi } from 'vitest'

import { reportUnmappedType } from '../src/helpers/unmapped-type-reporter'

const silenceConsoleWarn = () => vi.spyOn(console, 'warn').mockReturnValue()

describe('reportUnmappedType', () => {
  /** @type {import('../src/helpers/unmapped-type-reporter').UnmappedTypeInfo} */
  const sampleInfo = {
    location: 'block',
    tagName: 'aside',
  }

  test('no-ops when handling is not provided', () => {
    const consoleSpy = silenceConsoleWarn()
    reportUnmappedType(sampleInfo)
    expect(consoleSpy).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  test('no-ops when enabled is false', () => {
    const callback = vi.fn()
    const consoleSpy = silenceConsoleWarn()
    reportUnmappedType(sampleInfo, {
      enabled: false,
      logToConsole: true,
      onUnmappedType: callback,
    })
    expect(callback).not.toHaveBeenCalled()
    expect(consoleSpy).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  test('invokes onUnmappedType callback with info when enabled', () => {
    const callback = vi.fn()
    reportUnmappedType(sampleInfo, {
      enabled: true,
      onUnmappedType: callback,
    })
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(sampleInfo)
  })

  test('emits console.warn when logToConsole is true', () => {
    const consoleSpy = silenceConsoleWarn()
    reportUnmappedType(sampleInfo, {
      enabled: true,
      logToConsole: true,
    })
    expect(consoleSpy).toHaveBeenCalledTimes(1)
    expect(consoleSpy.mock.calls[0][0]).toContain('unmapped block type')
    expect(consoleSpy.mock.calls[0][0]).toContain('<aside>')
    consoleSpy.mockRestore()
  })

  test('does not log when logToConsole is not set', () => {
    const consoleSpy = silenceConsoleWarn()
    reportUnmappedType(sampleInfo, {
      enabled: true,
      onUnmappedType: vi.fn(),
    })
    expect(consoleSpy).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  test('includes context in the console message when provided', () => {
    const consoleSpy = silenceConsoleWarn()
    reportUnmappedType(
      { context: 'inside article', location: 'block', tagName: 'aside' },
      { enabled: true, logToConsole: true }
    )
    expect(consoleSpy.mock.calls[0][0]).toContain('context: inside article')
    consoleSpy.mockRestore()
  })

  test('supports both callback and console simultaneously', () => {
    const callback = vi.fn()
    const consoleSpy = silenceConsoleWarn()
    reportUnmappedType(sampleInfo, {
      enabled: true,
      logToConsole: true,
      onUnmappedType: callback,
    })
    expect(callback).toHaveBeenCalledTimes(1)
    expect(consoleSpy).toHaveBeenCalledTimes(1)
    consoleSpy.mockRestore()
  })
})
