declare module 'justjshtml/src/tokenizer.js' {
  export type Namespace = 'html' | 'math' | 'svg' | null
  export interface TokenizerToken {
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
  export interface ParseErrorLike {
    code: string
    column: number | null
    line: number | null
    message: string
  }
  export type TokenizerSinkResult = number

  export interface TokenizerSink {
    openElements?: Array<{ namespace?: Namespace }>
    open_elements?: Array<{ namespace?: Namespace }>
    processCharacters(data: string): TokenizerSinkResult
    processToken(token: TokenizerToken): TokenizerSinkResult
  }

  export interface TokenizerOptionsInput {
    discardBom?: boolean
    initialRawtextTag?: string | null
    initialState?: number | null
    xmlCoercion?: boolean
  }

  export class TokenizerOpts {
    constructor(options?: TokenizerOptionsInput)
    discardBom: boolean
    initialRawtextTag: string | null
    initialState: number | null
    xmlCoercion: boolean
  }

  export interface TokenizerRuntimeOptions {
    collectErrors?: boolean
  }

  export class Tokenizer {
    static DATA: number
    static TAG_OPEN: number
    static END_TAG_OPEN: number
    static TAG_NAME: number
    static BEFORE_ATTRIBUTE_NAME: number
    static ATTRIBUTE_NAME: number
    static AFTER_ATTRIBUTE_NAME: number
    static BEFORE_ATTRIBUTE_VALUE: number
    static ATTRIBUTE_VALUE_DOUBLE: number
    static ATTRIBUTE_VALUE_SINGLE: number
    static ATTRIBUTE_VALUE_UNQUOTED: number
    static AFTER_ATTRIBUTE_VALUE_QUOTED: number
    static SELF_CLOSING_START_TAG: number
    static MARKUP_DECLARATION_OPEN: number
    static COMMENT_START: number
    static COMMENT_START_DASH: number
    static COMMENT: number
    static COMMENT_END_DASH: number
    static COMMENT_END: number
    static COMMENT_END_BANG: number
    static BOGUS_COMMENT: number
    static DOCTYPE: number
    static BEFORE_DOCTYPE_NAME: number
    static DOCTYPE_NAME: number
    static AFTER_DOCTYPE_NAME: number
    static BOGUS_DOCTYPE: number
    static AFTER_DOCTYPE_PUBLIC_KEYWORD: number
    static AFTER_DOCTYPE_SYSTEM_KEYWORD: number
    static BEFORE_DOCTYPE_PUBLIC_IDENTIFIER: number
    static DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED: number
    static DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED: number
    static AFTER_DOCTYPE_PUBLIC_IDENTIFIER: number
    static BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS: number
    static BEFORE_DOCTYPE_SYSTEM_IDENTIFIER: number
    static DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED: number
    static DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED: number
    static AFTER_DOCTYPE_SYSTEM_IDENTIFIER: number
    static CDATA_SECTION: number
    static CDATA_SECTION_BRACKET: number
    static CDATA_SECTION_END: number
    static RCDATA: number
    static RCDATA_LESS_THAN_SIGN: number
    static RCDATA_END_TAG_OPEN: number
    static RCDATA_END_TAG_NAME: number
    static PLAINTEXT: number
    static RAWTEXT: number
    static RAWTEXT_LESS_THAN_SIGN: number
    static RAWTEXT_END_TAG_OPEN: number
    static RAWTEXT_END_TAG_NAME: number
    static SCRIPT_DATA_ESCAPED: number
    static SCRIPT_DATA_ESCAPED_DASH: number
    static SCRIPT_DATA_ESCAPED_DASH_DASH: number
    static SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN: number
    static SCRIPT_DATA_ESCAPED_END_TAG_OPEN: number
    static SCRIPT_DATA_ESCAPED_END_TAG_NAME: number
    static SCRIPT_DATA_DOUBLE_ESCAPE_START: number
    static SCRIPT_DATA_DOUBLE_ESCAPED: number
    static SCRIPT_DATA_DOUBLE_ESCAPED_DASH: number
    static SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH: number
    static SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN: number
    static SCRIPT_DATA_DOUBLE_ESCAPE_END: number

    constructor(
      sink: TokenizerSink,
      opts?: TokenizerOpts | TokenizerOptionsInput,
      runtimeOptions?: TokenizerRuntimeOptions
    )

    collectErrors: boolean
    errors: ParseErrorLike[]
    opts: TokenizerOpts
    sink: TokenizerSink

    initialize(html: string): void
    run(html: string): void
    step(): boolean
  }
}
