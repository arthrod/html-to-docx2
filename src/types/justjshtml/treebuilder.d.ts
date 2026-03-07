declare module 'justjshtml/src/treebuilder.js' {
  export interface FragmentContextLike {
    namespace: string | null
    tag_name?: string
    tagName?: string
  }

  export interface NodeLike {
    children?: NodeLike[]
    name?: string
  }

  export interface ParseErrorLike {
    code?: string
    column?: number | null
    line?: number | null
    message?: string
  }

  export interface TokenizerLike {
    errors?: ParseErrorLike[]
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

  export class TreeBuilder {
    constructor(
      fragmentContext?: FragmentContextLike | null,
      iframeSrcdoc?: boolean,
      collectErrors?: boolean
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
    quirks_mode: QuirksMode
    tokenizer: TokenizerLike | null
    tokenizer_state_override: number | null

    finish(): NodeLike
    process_characters(data: string): number
    process_token(token: TokenizerTokenLike): number
    processCharacters(data: string): number
    processToken(token: TokenizerTokenLike): number
  }
}
