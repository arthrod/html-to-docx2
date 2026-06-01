import { FragmentContext } from './context.js'
import { decodeHTML } from './encoding.js'
import { parseDocument } from './parser.js'
import { TokenizerOpts } from './tokenizer.js'

export interface JustHTMLOptions {
  collectErrors?: boolean
  encoding?: string | null
  strict?: boolean
  fragmentContext?: FragmentContext | null
  iframeSrcdoc?: boolean
  tokenizerOpts?: TokenizerOpts | Record<string, unknown> | null
}

export class StrictModeError extends SyntaxError {
  error: any
  constructor(error: any) {
    super(error?.message || String(error?.code || 'parse-error'))
    this.error = error
  }
}

export interface JustHTMLOptions {
  collectErrors?: boolean
  encoding?: string | null
  strict?: boolean
  fragmentContext?: unknown
  iframeSrcdoc?: boolean
  tokenizerOpts?: unknown
}

export interface ToTextOptions {
  separator?: string
  strip?: boolean
}

export interface ToHTMLOptions {
  indent?: number
  indentSize?: number
  pretty?: boolean
}

export class JustHTML {
  collectErrors: boolean
  encoding: string | null
  errors: any[]
  fragmentContext: unknown
  iframeSrcdoc: boolean
  root: any
  strict: boolean
  constructor(input: string | ArrayBuffer | Uint8Array, options: JustHTMLOptions = {}) {
    const {
      collectErrors = false,
      encoding = null,
      strict = false,
      fragmentContext = null,
      iframeSrcdoc = false,
      tokenizerOpts = null,
    } = options

    this.encoding = null
    this.errors = []
    this.fragmentContext = fragmentContext

    let html = input
    if (html == null) html = ''

    if (typeof html === 'string') {
      // Already decoded.
    } else if (html instanceof ArrayBuffer) {
      const bytes = new Uint8Array(html)
      const decoded = decodeHTML(bytes, { transportEncoding: encoding })
      this.encoding = decoded.encoding
      html = decoded.text
    } else if (html instanceof Uint8Array) {
      const decoded = decodeHTML(html, { transportEncoding: encoding })
      this.encoding = decoded.encoding
      html = decoded.text
    } else {
      html = String(html)
    }

    const shouldCollect = Boolean(collectErrors) || Boolean(strict)
    const parsed = parseDocument(html, {
      fragmentContext,
      iframeSrcdoc: Boolean(iframeSrcdoc),
      collectErrors: shouldCollect,
      tokenizerOpts,
    })
    this.root = parsed.root
    this.errors = parsed.errors

    this.collectErrors = Boolean(collectErrors)
    this.strict = Boolean(strict)
    this.iframeSrcdoc = Boolean(iframeSrcdoc)

    if (this.strict && this.errors.length) {
      throw new StrictModeError(this.errors[0])
    }
  }

  toText(options?: ToTextOptions) {
    return this.root.toText(options)
  }

  to_text(options?: ToTextOptions) {
    return this.toText(options)
  }

  toHTML(options?: ToHTMLOptions) {
    return this.root.toHTML(options)
  }

  to_html(indent = 0, indentSize = 2, pretty = true) {
    return this.toHTML({ indent, indentSize, pretty })
  }

  query(selector: string) {
    return this.root.query(selector)
  }

  toMarkdown() {
    return this.root.toMarkdown()
  }

  to_markdown() {
    return this.toMarkdown()
  }
}
