declare module 'justjshtml/src/html5lib_serializer.js' {
  export type Html5libTagName = string
  export type Html5libAttributeMap = Readonly<Record<string, string | null>>
  export interface Html5libAttributeEntry {
    name: string
    value?: string | null
  }
  export type Html5libAttributeInput =
    | Html5libAttributeMap
    | ReadonlyArray<Html5libAttributeEntry>

  export type SerializerStartTagToken =
    | ['StartTag', Html5libAttributeInput, Html5libTagName]
    | ['StartTag', Html5libAttributeInput, Html5libTagName, Html5libAttributeInput]

  export type SerializerEndTagToken = ['EndTag', Html5libAttributeInput, Html5libTagName]
  export type SerializerEmptyTagToken = [
    'EmptyTag',
    Html5libTagName,
    Html5libAttributeInput,
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
