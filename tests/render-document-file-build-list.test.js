// @ts-check

import { beforeEach, describe, expect, test, vi } from 'vitest'

import { buildList } from '../src/helpers/render-document-file'
import { VNode, VText } from '../src/vdom/index'
import * as xmlBuilder from '../src/helpers/xml-builder'

/**
 * @typedef {{
 *   createNumbering: (type: 'ol' | 'ul', properties?: Record<string, string | number | boolean>) => number
 * }} BuildListDoc
 */

/** @returns {{ imports: Array<unknown> xmlFragment: { import: (value: unknown) => void } }} */
function createXmlFragmentCollector() {
  /** @type {Array<unknown>} */
  const imports = []
  return {
    imports,
    xmlFragment: {
      import: (value) => {
        imports.push(value)
      },
    },
  }
}

describe('render-document-file buildList', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  test('converts list items to numbered paragraph fragments', async () => {
    let numberingSeed = 10

    /** @type {BuildListDoc} */
    const doc = {
      createNumbering: () => {
        numberingSeed += 1
        return numberingSeed
      },
    }

    const paraFragment = /** @type {import('../src/utils/xmlbuilder2').XMLBuilder} */ ({})
    const paragraphSpy = vi
      .spyOn(xmlBuilder, 'buildParagraph')
      .mockResolvedValue(paraFragment)
    const { imports, xmlFragment } = createXmlFragmentCollector()

    const listNode = new VNode('ul', {}, [
      new VNode('li', {}, [new VText('First')]),
      new VNode('li', {}, [new VText('Second')]),
    ])

    await buildList(listNode, doc, xmlFragment)

    expect(paragraphSpy).toHaveBeenCalledTimes(2)
    expect(paragraphSpy).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({ numbering: expect.objectContaining({ levelId: 0 }) }),
      doc
    )
    expect(imports).toHaveLength(2)
  })

  test('handles nested lists with deeper numbering levels', async () => {
    let numberingSeed = 20

    /** @type {BuildListDoc} */
    const doc = {
      createNumbering: () => {
        numberingSeed += 1
        return numberingSeed
      },
    }

    const paraFragment = /** @type {import('../src/utils/xmlbuilder2').XMLBuilder} */ ({})
    const paragraphSpy = vi
      .spyOn(xmlBuilder, 'buildParagraph')
      .mockResolvedValue(paraFragment)
    const { xmlFragment } = createXmlFragmentCollector()

    const nestedList = new VNode('ul', {}, [
      new VNode('li', {}, [new VText('Outer')]),
      new VNode('li', {}, [
        new VNode('ul', {}, [new VNode('li', {}, [new VText('Inner')])]),
      ]),
    ])

    await buildList(nestedList, doc, xmlFragment)

    expect(paragraphSpy).toHaveBeenCalled()
    const options = paragraphSpy.mock.calls.map((call) => call[1])
    const levelIds = options
      .filter((opt) => typeof opt === 'object' && opt !== null && 'numbering' in opt)
      .map((opt) => opt.numbering.levelId)

    expect(levelIds).toContain(0)
    expect(levelIds).toContain(1)
  })
})
