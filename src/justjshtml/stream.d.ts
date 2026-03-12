declare module 'justjshtml/src/stream.js' {
  export type NodeAttributes = Readonly<Record<string, string>>
  export type SupportedEncoding =
    | 'utf-8'
    | 'windows-1252'
    | 'iso-8859-2'
    | 'euc-jp'
    | 'utf-16'
    | 'utf-16le'
    | 'utf-16be'

  export interface TokenizerOptionsInputLike {
    discardBom?: boolean
    initialRawtextTag?: string | null
    initialState?: number | null
    xmlCoercion?: boolean
  }

  export type StreamStartEvent = ['start', [string, NodeAttributes]]
  export type StreamEndEvent = ['end', string]
  export type StreamCommentEvent = ['comment', string]
  export type StreamTextEvent = ['text', string]
  export type StreamDoctypeEvent = [
    'doctype',
    [string | null, string | null, string | null],
  ]

  export type StreamEvent =
    | StreamCommentEvent
    | StreamDoctypeEvent
    | StreamEndEvent
    | StreamStartEvent
    | StreamTextEvent

  export interface StreamOptions {
    encoding?: SupportedEncoding | null
    tokenizerOpts?: TokenizerOptionsInputLike | null
  }

  export function stream(
    html: string | ArrayBuffer | Uint8Array | null | undefined,
    options?: StreamOptions
  ): Generator<StreamEvent, void, undefined>
}
