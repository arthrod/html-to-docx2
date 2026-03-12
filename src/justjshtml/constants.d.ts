declare module 'justjshtml/src/constants.js' {
  export type ForeignAttributeAdjustment = readonly [string | null, string, string]

  export const FOREIGN_ATTRIBUTE_ADJUSTMENTS: Readonly<
    Record<string, ForeignAttributeAdjustment>
  >
  export const MATHML_ATTRIBUTE_ADJUSTMENTS: Readonly<Record<string, string>>
  export const SVG_ATTRIBUTE_ADJUSTMENTS: Readonly<Record<string, string>>
  export const SVG_TAG_NAME_ADJUSTMENTS: Readonly<Record<string, string>>
  export const NAMESPACE_URL_TO_PREFIX: Readonly<Record<string, string>>

  export const HTML_INTEGRATION_POINT_SET: ReadonlySet<string>
  export const MATHML_TEXT_INTEGRATION_POINT_SET: ReadonlySet<string>

  export const QUIRKY_PUBLIC_PREFIXES: ReadonlyArray<string>
  export const QUIRKY_PUBLIC_MATCHES: ReadonlyArray<string>
  export const QUIRKY_SYSTEM_MATCHES: ReadonlyArray<string>
  export const LIMITED_QUIRKY_PUBLIC_PREFIXES: ReadonlyArray<string>
  export const HTML4_PUBLIC_PREFIXES: ReadonlyArray<string>

  export const HEADING_ELEMENTS: ReadonlySet<string>
  export const FORMATTING_ELEMENTS: ReadonlySet<string>
  export const SPECIAL_ELEMENTS: ReadonlySet<string>

  export const FORMAT_MARKER: symbol
  export const DEFAULT_SCOPE_TERMINATORS: ReadonlySet<string>
  export const BUTTON_SCOPE_TERMINATORS: ReadonlySet<string>
  export const LIST_ITEM_SCOPE_TERMINATORS: ReadonlySet<string>
  export const DEFINITION_SCOPE_TERMINATORS: ReadonlySet<string>
  export const TABLE_FOSTER_TARGETS: ReadonlySet<string>
  export const FOREIGN_BREAKOUT_ELEMENTS: ReadonlySet<string>
  export const TABLE_ALLOWED_CHILDREN: ReadonlySet<string>
  export const TABLE_SCOPE_TERMINATORS: ReadonlySet<string>
  export const IMPLIED_END_TAGS: ReadonlySet<string>
  export const VOID_ELEMENTS: ReadonlySet<string>

  export function integrationPointKey(namespace: string, name: string): string
}
