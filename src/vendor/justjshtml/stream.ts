import { decodeHTML } from './encoding.js'
import { Tokenizer, TokenizerOpts } from './tokenizer.js'
import { CommentToken, DoctypeToken, Tag, TokenSinkResult } from './tokens.js'

class StreamSink {
  events: any
  openElements: any
  constructor() {
    this.events = []
    this.openElements = [{ namespace: 'html' }]
  }

  processToken(token: any) {
    if (token instanceof Tag) {
      if (token.kind === Tag.START) {
        this.events.push(['start', [token.name, { ...(token.attrs || {}) }]])
      } else {
        this.events.push(['end', token.name])
      }
      return TokenSinkResult.Continue
    }

    if (token instanceof CommentToken) {
      this.events.push(['comment', token.data])
      return TokenSinkResult.Continue
    }

    if (token instanceof DoctypeToken) {
      const dt = token.doctype
      this.events.push([
        'doctype',
        [dt?.name ?? null, dt?.publicId ?? null, dt?.systemId ?? null],
      ])
      return TokenSinkResult.Continue
    }

    return TokenSinkResult.Continue
  }

  processCharacters(data: any) {
    this.events.push(['text', data])
  }
}

export interface StreamOpts {
  encoding?: string | null
  tokenizerOpts?: TokenizerOpts | Record<string, unknown> | null
}

export function* stream(
  html: string | Uint8Array | ArrayBuffer | null | undefined,
  { encoding = null, tokenizerOpts = null }: StreamOpts = {},
) {
  let input = html
  if (input == null) input = ''

  if (typeof input === 'string') {
    // Already decoded.
  } else if (input instanceof ArrayBuffer) {
    input = new Uint8Array(input)
  }

  if (input instanceof Uint8Array) {
    const decoded = decodeHTML(input, { transportEncoding: encoding })
    input = decoded.text
  } else {
    input = String(input)
  }

  const sink = new StreamSink()
  const opts =
    tokenizerOpts instanceof TokenizerOpts
      ? tokenizerOpts
      : new TokenizerOpts(tokenizerOpts || {})
  const tokenizer = new Tokenizer(sink, opts)
  tokenizer.initialize(input)

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const isEof = tokenizer.step()

    if (sink.events.length) {
      let textBuffer = null

      for (const [event, data] of sink.events) {
        if (event === 'text') {
          if (textBuffer == null) textBuffer = ''
          textBuffer += data || ''
          continue
        }

        if (textBuffer != null) {
          yield ['text', textBuffer]
          textBuffer = null
        }
        yield [event, data]
      }

      if (textBuffer != null) yield ['text', textBuffer]
      sink.events.length = 0
    }

    if (isEof) break
  }
}
