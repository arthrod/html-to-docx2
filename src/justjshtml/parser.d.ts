declare module 'justjshtml/src/parser.js' {
  import type { Node } from 'justjshtml/src/node.js'
  import type {
    Tokenizer,
    TokenizerOptionsInput,
    TokenizerOpts,
  } from 'justjshtml/src/tokenizer.js'

  export interface FragmentContextLike {
    namespace: 'html' | 'math' | 'svg' | null
    tag_name?: string
    tagName?: string
  }

  export interface ParseErrorLike {
    code: string
    column: number | null
    line: number | null
    message: string
  }

  export interface ParseDocumentOptions {
    collectErrors?: boolean
    fragmentContext?: FragmentContextLike | null
    iframeSrcdoc?: boolean
    tokenizerOpts?: TokenizerOptionsInput | TokenizerOpts | null
  }

  export interface ParserTreeBuilder {
    errors: ParseErrorLike[]
    finish(): Node
    openElements: Node[]
    open_elements: Node[]
    tokenizer: Tokenizer | null
  }

  export interface ParsedDocument {
    errors: ParseErrorLike[]
    root: Node
    tokenizer: Tokenizer
    treeBuilder: ParserTreeBuilder
  }

  export function parseDocument(
    html: string,
    options?: ParseDocumentOptions
  ): ParsedDocument
}
