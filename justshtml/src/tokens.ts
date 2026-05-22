export class Tag {
  static START = 0;
  static END = 1;

  attrs: any;
  kind: any;
  name: any;
  selfClosing: any;

  constructor(kind: any, name: any, attrs: any, selfClosing = false) {
    this.kind = kind;
    this.name = name;
    this.attrs = attrs ?? {};
    this.selfClosing = Boolean(selfClosing);
  }
}

export class CharacterToken {
  data: any;
  constructor(data: any) {
    this.data = data;
  }
}

export class CommentToken {
  data: any;
  constructor(data: any) {
    this.data = data;
  }
}

export class Doctype {
  forceQuirks: any;
  name: any;
  publicId: any;
  systemId: any;
  constructor({ name = null, publicId = null, systemId = null, forceQuirks = false } = {}) {
    this.name = name;
    this.publicId = publicId;
    this.systemId = systemId;
    this.forceQuirks = Boolean(forceQuirks);
  }
}

export class DoctypeToken {
  doctype: any;
  constructor(doctype: any) {
    this.doctype = doctype;
  }
}

export class EOFToken {}

export class TokenSinkResult {
  static Continue = 0;
  static Plaintext = 1;
}

export class ParseError {
  code: any;
  column: any;
  line: any;
  message: any;
  constructor(code: any, { line = null, column = null, message = null } = {}) {
    this.code = code;
    this.line = line;
    this.column = column;
    this.message = message || code;
  }

  toString() {
    if (this.line != null && this.column != null) return `(${this.line},${this.column}): ${this.code}`;
    return this.code;
  }
}

