declare module 'justjshtml/src/html5lib_serializer.js' {
  export type Html5libTagName = string

  export type SerializerStartTagToken =
    | ['StartTag', Record<string, string>, Html5libTagName]
    | ['StartTag', Record<string, string>, Html5libTagName, Record<string, string>]

  export type SerializerEndTagToken = ['EndTag', Record<string, string>, Html5libTagName]
  export type SerializerEmptyTagToken = [
    'EmptyTag',
    Html5libTagName,
    Record<string, string>,
  ]
  export type SerializerCharactersToken = ['Characters', string]
  export type SerializerCommentToken = ['Comment', string]
  export type SerializerDoctypeToken =
    | ['Doctype', string]
    | ['Doctype', string, string | null]
    | ['Doctype', string, string | null, string | null]

  export type SerializerToken =
    | SerializerCharactersToken
    | SerializerCommentToken
    | SerializerDoctypeToken
    | SerializerEmptyTagToken
    | SerializerEndTagToken
    | SerializerStartTagToken

  export interface SerializeSerializerTokenStreamOptions {
    encoding?: string
    escape_lt_in_attrs?: boolean
    escape_rcdata?: boolean
    inject_meta_charset?: boolean
    minimize_boolean_attributes?: boolean
    quote_attr_values?: boolean
    quote_char?: '"' | "'" | null
    strip_whitespace?: boolean
    use_trailing_solidus?: boolean
  }

  export function serializeSerializerTokenStream(
    tokens: ReadonlyArray<SerializerToken>,
    options?: SerializeSerializerTokenStreamOptions
  ): string | null
}
