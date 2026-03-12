declare module 'justjshtml/src/entities.js' {
  export interface DecodeNumericEntityOptions {
    isHex?: boolean
  }

  export interface DecodeEntitiesInTextOptions {
    inAttribute?: boolean
  }

  export const LEGACY_ENTITIES: ReadonlySet<string>

  export function decodeNumericEntity(
    text: string,
    options?: DecodeNumericEntityOptions
  ): string
  export function decodeEntitiesInText(
    text: string,
    options?: DecodeEntitiesInTextOptions
  ): string
}
