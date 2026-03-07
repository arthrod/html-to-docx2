import { default as _generateContainer } from './html-to-docx'
import type { DocumentOptions } from './index-base'

const generateContainer = _generateContainer as (
  htmlString: string,
  headerHTMLString?: string | null,
  documentOptions?: DocumentOptions,
  footerHTMLString?: string | null
) => Promise<Blob>

export { generateContainer as HTMLtoDOCX }
export default generateContainer
export * from './index-base'

export type BrowserDocxResult = Blob
export type HtmlToDocxResult = Blob
