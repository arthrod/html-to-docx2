declare module 'justjshtml/src/parser.js' {
  import type { FragmentContext } from 'justjshtml/src/context.js'
  import type { Node } from 'justjshtml/src/node.js'
  import type { ParseError } from 'justjshtml/src/tokens.js'

  export interface ParseDocumentOptions {
    collectErrors?: boolean
    fragmentContext?: FragmentContext | null
    iframeSrcdoc?: boolean
    tokenizerOpts?: object | null
  }

  export interface ParsedDocument {
    errors: ParseError[]
    root: Node
    tokenizer: object
    treeBuilder: object
  }

  export function parseDocument(
    html: string,
    options?: ParseDocumentOptions
  ): ParsedDocument
}
