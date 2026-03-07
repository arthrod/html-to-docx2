declare module 'justjshtml/src/parser.js' {
  import type { Node } from 'justjshtml/src/node.js'
  import type {
    Tokenizer,
    TokenizerOptionsInput,
    TokenizerOpts,
  } from 'justjshtml/src/tokenizer.js'

  export interface TreeBuilderLike {
    errors: Array<{
      code: string
      column: number | null
      line: number | null
      message: string
    }>
    finish(): Node
    openElements?: Node[]
    open_elements?: Node[]
    tokenizer?: Tokenizer | null
  }

  export interface FragmentContextLike {
    namespace: string | null
    tag_name: string
    tagName: string
  }

  export interface ParseDocumentOptions {
    collectErrors?: boolean
    fragmentContext?: FragmentContextLike | null
    iframeSrcdoc?: boolean
    tokenizerOpts?: TokenizerOptionsInput | TokenizerOpts | null
  }

  export interface ParsedDocument {
    errors: Array<{
      code: string
      column: number | null
      line: number | null
      message: string
    }>
    root: Node
    tokenizer: Tokenizer
    treeBuilder: TreeBuilderLike
  }

  export function parseDocument(
    html: string,
    options?: ParseDocumentOptions
  ): ParsedDocument
}
