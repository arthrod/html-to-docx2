declare module 'justjshtml/src/treebuilder.js' {
  import type { Tokenizer } from 'justjshtml/src/tokenizer.js'

  export interface FragmentContextLike {
    namespace: 'html' | 'math' | 'svg' | null
    tag_name?: string
    tagName?: string
  }
  export interface NodeLike {
    attrs?: Readonly<Record<string, string | null>>
    children: NodeLike[]
    data?: string | null
    name: string
    namespace: 'html' | 'math' | 'svg' | null
    parent: NodeLike | null
    templateContent?: NodeLike | null
    template_content?: NodeLike | null
  }
  export interface ParseErrorLike {
    code: string
    column: number | null
    line: number | null
    message: string
  }
  export interface TokenizerTokenLike {
    data?: string
    doctype?: {
      forceQuirks?: boolean
      name?: string | null
      publicId?: string | null
      systemId?: string | null
    }
    kind?: number
    name?: string
  }

  export type QuirksMode = 'limited-quirks' | 'no-quirks' | 'quirks'
  export type TreeBuilderResult = number

  export class TreeBuilder {
    constructor(
      fragment_context?: FragmentContextLike | null,
      iframe_srcdoc?: boolean,
      collect_errors?: boolean
    )

    collect_errors: boolean
    document: NodeLike
    errors: ParseErrorLike[]
    form_element: NodeLike | null
    fragment_context: FragmentContextLike | null
    fragment_context_element: NodeLike | null
    frameset_ok: boolean
    head_element: NodeLike | null
    iframe_srcdoc: boolean
    mode: number
    open_elements: NodeLike[]
    openElements?: NodeLike[]
    original_mode: number | null
    table_text_original_mode: number | null
    active_formatting: Array<NodeLike | symbol>
    insert_from_table: boolean
    pending_table_text: string[]
    template_modes: number[]
    quirks_mode: QuirksMode
    tokenizer: Tokenizer | null
    tokenizer_state_override: number | null

    finish(): NodeLike
    process_characters(data: string): TreeBuilderResult
    process_token(token: TokenizerTokenLike): TreeBuilderResult
    processCharacters(data: string): TreeBuilderResult
    processToken(token: TokenizerTokenLike): TreeBuilderResult
  }
}
