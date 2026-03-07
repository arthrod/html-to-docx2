declare module 'justjshtml/src/encoding.js' {
  export type SupportedEncoding =
    | 'utf-8'
    | 'windows-1252'
    | 'iso-8859-2'
    | 'euc-jp'
    | 'utf-16'
    | 'utf-16le'
    | 'utf-16be'

  export interface EncodingResult {
    bomLength: number
    encoding: SupportedEncoding
  }

  export interface DecodedHtml {
    encoding: SupportedEncoding
    text: string
  }

  export interface EncodingOptions {
    transportEncoding?: string | Uint8Array | null
  }

  export function normalizeEncodingLabel(
    label: string | Uint8Array | null | undefined
  ): SupportedEncoding | null
  export function sniffHTMLEncoding(
    data: Uint8Array,
    options?: EncodingOptions
  ): EncodingResult
  export function decodeHTML(data: Uint8Array, options?: EncodingOptions): DecodedHtml
}
