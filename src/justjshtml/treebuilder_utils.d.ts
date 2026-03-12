declare module 'justjshtml/src/treebuilder_utils.js' {
  export type QuirksMode = 'limited-quirks' | 'no-quirks' | 'quirks'

  export const InsertionMode: Readonly<Record<string, number>>

  export interface DoctypeLike {
    forceQuirks?: boolean
    name?: string | null
    publicId?: string | null
    systemId?: string | null
  }

  export interface DoctypeErrorOptions {
    iframeSrcdoc?: boolean
  }

  export function isAllWhitespace(text: string | null | undefined): boolean
  export function doctypeErrorAndQuirks(
    doctype: DoctypeLike | null | undefined,
    options?: DoctypeErrorOptions
  ): [boolean, QuirksMode]
}
