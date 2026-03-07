import * as xmlbuilder2Import from 'xmlbuilder2/lib/xmlbuilder2.min.js'
import type * as XMLBuilder2 from 'xmlbuilder2'

type XMLBuilder2Namespace = {
  default?: Partial<typeof XMLBuilder2>
} & Partial<typeof XMLBuilder2>

const isXMLBuilder2Namespace = (value: object): value is XMLBuilder2Namespace => {
  return 'builder' in value || 'default' in value
}

const resolveXMLBuilder2Module = (): typeof XMLBuilder2 => {
  if (!isXMLBuilder2Namespace(xmlbuilder2Import)) {
    throw new TypeError('Failed to resolve xmlbuilder2 namespace import')
  }
  const moduleCandidate = xmlbuilder2Import.default ?? xmlbuilder2Import
  if (
    !moduleCandidate.builder ||
    !moduleCandidate.convert ||
    !moduleCandidate.create ||
    !moduleCandidate.createCB ||
    !moduleCandidate.fragment ||
    !moduleCandidate.fragmentCB
  ) {
    throw new TypeError('xmlbuilder2 import is missing required factory functions')
  }
  return moduleCandidate as typeof XMLBuilder2
}

const xmlbuilder2Module = resolveXMLBuilder2Module()

export const builder = xmlbuilder2Module.builder
export const convert = xmlbuilder2Module.convert
export const create = xmlbuilder2Module.create
export const createCB = xmlbuilder2Module.createCB
export const fragment = xmlbuilder2Module.fragment
export const fragmentCB = xmlbuilder2Module.fragmentCB

export type { XMLBuilder } from 'xmlbuilder2/lib/interfaces'
