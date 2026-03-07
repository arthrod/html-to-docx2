declare module 'justjshtml/src/tokens.js' {
  export class Tag {
    static END: 1
    static START: 0

    constructor(
      kind: 0 | 1,
      name: string,
      attrs?: Record<string, string> | null,
      selfClosing?: boolean
    )

    attrs: Record<string, string>
    kind: 0 | 1
    name: string
    selfClosing: boolean
  }

  export class CharacterToken {
    constructor(data: string)
    data: string
  }

  export class CommentToken {
    constructor(data: string)
    data: string
  }

  export interface DoctypeInput {
    forceQuirks?: boolean
    name?: string | null
    publicId?: string | null
    systemId?: string | null
  }

  export class Doctype {
    constructor(input?: DoctypeInput)
    forceQuirks: boolean
    name: string | null
    publicId: string | null
    systemId: string | null
  }

  export class DoctypeToken {
    constructor(doctype: Doctype)
    doctype: Doctype
  }

  export interface EOFToken {}

  export const TokenSinkResult: {
    Continue: 0
    Plaintext: 1
  }

  export interface ParseErrorLocation {
    column?: number | null
    line?: number | null
    message?: string | null
  }

  export class ParseError {
    constructor(code: string, location?: ParseErrorLocation)
    code: string
    column: number | null
    line: number | null
    message: string
    toString(): string
  }
}
