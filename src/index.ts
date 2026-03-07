export * from './index-base'
export { default as HTMLtoDOCX, default } from './html-to-docx'

// Keep union types for backward compatibility in direct imports.
export type BrowserDocxResult = Blob
export type NodeDocxResult = Buffer | Uint8Array
export type HtmlToDocxResult = BrowserDocxResult | NodeDocxResult
