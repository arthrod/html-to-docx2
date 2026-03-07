/* eslint-disable oxc/no-barrel-file -- public API surface */
import { default as _generateContainer } from './html-to-docx'
import type { DocumentOptions } from './index-base'

const generateContainer = _generateContainer as (
  htmlString: string,
  headerHTMLString?: string | null,
  documentOptions?: DocumentOptions,
  footerHTMLString?: string | null
) => Promise<Buffer | Uint8Array>

export { generateContainer as HTMLtoDOCX }
export default generateContainer
export * from './index-base'

export type NodeDocxResult = Buffer | Uint8Array
export type HtmlToDocxResult = Buffer | Uint8Array
