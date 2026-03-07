declare module 'justjshtml/src/stream.js' {
  import type { SupportedEncoding } from 'justjshtml/src/encoding.js'
  import type { TokenizerOptionsInput, TokenizerOpts } from 'justjshtml/src/tokenizer.js'

  export type StreamStartEvent = ['start', [string, Record<string, string>]]
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
    tokenizerOpts?: TokenizerOptionsInput | TokenizerOpts | null
  }

  export function stream(
    html: string | ArrayBuffer | Uint8Array,
    options?: StreamOptions
  ): Generator<StreamEvent, void, undefined>
}
