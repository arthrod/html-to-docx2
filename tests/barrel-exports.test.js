import { describe, expect, test } from 'vitest'

import rootDefault, { HTMLtoDOCX as rootNamed } from '../index.ts'
import * as helpers from '../src/helpers/index.ts'
import * as schemas from '../src/schemas/index.ts'
import * as utils from '../src/utils/index.ts'

describe('barrel export modules', () => {
  test('root index re-exports the default converter', () => {
    expect(typeof rootDefault).toBe('function')
    expect(rootDefault).toBe(rootNamed)
  })

  test('helpers barrel exports expected builder functions', () => {
    expect(typeof helpers.buildParagraph).toBe('function')
    expect(typeof helpers.buildTable).toBe('function')
    expect(typeof helpers.renderDocumentFile).toBe('function')
  })

  test('schemas barrel exports expected template builders', () => {
    expect(typeof schemas.contentTypesXML).toBe('string')
    expect(typeof schemas.generateCoreXML).toBe('function')
    expect(typeof schemas.generateDocumentTemplate).toBe('function')
    expect(typeof schemas.generateStylesXML).toBe('function')
  })

  test('utils barrel exports expected utilities', () => {
    expect(typeof utils.escapeXml).toBe('function')
    expect(typeof utils.pixelToTWIP).toBe('function')
    expect(typeof utils.rgbToHex).toBe('function')
    expect(typeof utils.sanitizeSVGVNode).toBe('function')
  })
})
