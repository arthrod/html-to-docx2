declare module 'justjshtml/src/justhtml.js' {
  export interface FragmentContextLike {
    namespace: string | null
    tag_name?: string
    tagName?: string
  }

  export interface NodeLike {
    children?: NodeLike[]
    name?: string
    query?(selector: string): NodeLike[]
    toHTML?(options?: { indent?: number; indentSize?: number; pretty?: boolean }): string
    toMarkdown?(): string
    toText?(options?: { separator?: string; strip?: boolean }): string
  }

  export interface ParseErrorLike {
    code?: string
    column?: number | null
    line?: number | null
    message?: string
  }

  export interface TokenizerOptionsInputLike {
    discardBom?: boolean
    initialRawtextTag?: string | null
    initialState?: number | null
    xmlCoercion?: boolean
  }

  export type SupportedEncodingLike = string

  export interface JustHTMLOptions {
    collectErrors?: boolean
    encoding?: SupportedEncodingLike | null
    fragmentContext?: FragmentContextLike | null
    iframeSrcdoc?: boolean
    strict?: boolean
    tokenizerOpts?: TokenizerOptionsInputLike | null
  }

  export class StrictModeError extends SyntaxError {
    constructor(error?: ParseErrorLike | null)
    error?: ParseErrorLike | null
  }

  export class JustHTML {
    constructor(input: string | ArrayBuffer | Uint8Array, options?: JustHTMLOptions)

    collectErrors: boolean
    encoding: SupportedEncodingLike | null
    errors: ParseErrorLike[]
    fragmentContext: FragmentContextLike | null
    iframeSrcdoc: boolean
    root: NodeLike
    strict: boolean

    query(selector: string): NodeLike[]
    toHTML(options?: { indent?: number; indentSize?: number; pretty?: boolean }): string
    toMarkdown(): string
    toText(options?: { separator?: string; strip?: boolean }): string
    to_html(indent?: number, indentSize?: number, pretty?: boolean): string
    to_markdown(): string
    to_text(options?: { separator?: string; strip?: boolean }): string
  }
}
