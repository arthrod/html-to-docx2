import * as xmlbuilder2Import from 'xmlbuilder2/lib/xmlbuilder2.min.js'
import type * as XMLBuilder2 from 'xmlbuilder2'

type XMLBuilder2Namespace = {
  default?: Partial<typeof XMLBuilder2>
} & Partial<typeof XMLBuilder2>

const xmlbuilder2Candidate = xmlbuilder2Import as XMLBuilder2Namespace

const xmlbuilder2Module = (xmlbuilder2Candidate.default ??
  xmlbuilder2Candidate) as typeof XMLBuilder2

export const builder = xmlbuilder2Module.builder
export const convert = xmlbuilder2Module.convert
export const create = xmlbuilder2Module.create
export const createCB = xmlbuilder2Module.createCB
export const fragment = xmlbuilder2Module.fragment
export const fragmentCB = xmlbuilder2Module.fragmentCB

export type { XMLBuilder } from 'xmlbuilder2/lib/interfaces'
