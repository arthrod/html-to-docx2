// @ts-check

import { describe, expect, test } from 'vitest'

import { buildDrawing } from '../src/helpers/xml-builder'

describe('xml-builder drawing fragments', () => {
  test('buildDrawing creates anchored drawing markup when inline flag is false', () => {
    const fragment = buildDrawing(false, 'picture', {
      description: 'diagram',
      fileNameWithExtension: 'diagram.png',
      height: Number.NaN,
      id: 42,
      relationshipId: 7,
      width: 0,
    })

    const xml = fragment.toString()
    expect(xml).toContain('<anchor ')
    expect(xml).toContain('<simplePos ')
    expect(xml).toContain('<positionH ')
    expect(xml).toContain('<positionV ')
    expect(xml).toContain('<wrapSquare ')
    // Invalid/non-positive width/height should fall back to default 100px EMU size.
    expect(xml).toContain('cx="952500"')
    expect(xml).toContain('cy="952500"')
  })

  test('buildDrawing creates inline drawing markup when inline flag is true', () => {
    const fragment = buildDrawing(true, 'picture', {
      fileNameWithExtension: 'inline.png',
      height: 1234,
      id: 9,
      relationshipId: 3,
      width: 4321,
    })

    const xml = fragment.toString()
    expect(xml).toContain('<inline ')
    expect(xml).not.toContain('<anchor ')
    expect(xml).toContain('cx="4321"')
    expect(xml).toContain('cy="1234"')
  })
})
