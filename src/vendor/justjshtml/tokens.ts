export class Tag {
  static START = 0
  static END = 1

  attrs: Record<string, string>
  kind: number
  name: string
  selfClosing: boolean

  constructor(kind: number, name: string, attrs: Record<string, string> | null, selfClosing = false) {
    this.kind = kind
    this.name = name
    this.attrs = attrs ?? {}
    this.selfClosing = Boolean(selfClosing)
  }
}

export class CharacterToken {
  data: string
  constructor(data: string) {
    this.data = data
  }
}

export class CommentToken {
  data: string
  constructor(data: string) {
    this.data = data
  }
}

export class Doctype {
  forceQuirks: boolean
  name: string | null
  publicId: string | null
  systemId: string | null
  constructor({
    name = null,
    publicId = null,
    systemId = null,
    forceQuirks = false,
  }: {
    forceQuirks?: boolean
    name?: string | null
    publicId?: string | null
    systemId?: string | null
  } = {}) {
    this.name = name
    this.publicId = publicId
    this.systemId = systemId
    this.forceQuirks = Boolean(forceQuirks)
  }
}

export class DoctypeToken {
  doctype: Doctype
  constructor(doctype: Doctype) {
    this.doctype = doctype
  }
}

export class EOFToken {}

export class TokenSinkResult {
  static Continue = 0
  static Plaintext = 1
}

export class ParseError {
  code: string
  column: number | null
  line: number | null
  message: string
  constructor(
    code: string,
    {
      line = null,
      column = null,
      message = null,
    }: {
      column?: number | null
      line?: number | null
      message?: string | null
    } = {}
  ) {
    this.code = code
    this.line = line
    this.column = column
    this.message = message || code
  }

  toString() {
    if (this.line != null && this.column != null)
      return `(${this.line},${this.column}): ${this.code}`
    return this.code
  }
}
