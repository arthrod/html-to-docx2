export * from './index-base'
export { default as HTMLtoDOCX, default } from './html-to-docx-node'

export type BrowserDocxResult = Blob
export type NodeDocxResult = Buffer
export type HtmlToDocxResult = Blob | Buffer
