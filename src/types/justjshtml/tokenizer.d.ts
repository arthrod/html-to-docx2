declare module 'justjshtml/src/tokenizer.js' {
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

  export interface TokenizerSink {
    openElements?: Array<{ namespace?: string | null }>
    processCharacters(data: string): number
    processToken(token: TokenizerToken): number
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
    static PLAINTEXT: number
    static RAWTEXT: number

    constructor(
      sink: TokenizerSink,
      opts?: TokenizerOpts,
      runtimeOptions?: TokenizerRuntimeOptions
    )

    collectErrors: boolean
    errors: Array<{
      code: string
      column: number | null
      line: number | null
      message: string
    }>
    opts: TokenizerOpts
    sink: TokenizerSink

    initialize(html: string): void
    run(html: string): void
    step(): boolean
  }
}
