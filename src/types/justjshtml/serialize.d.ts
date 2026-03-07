declare module 'justjshtml/src/serialize.js' {
  import type { Node } from 'justjshtml/src/node.js'

  export interface ToTestFormatOptions {
    foreignAttributeAdjustments?: Readonly<Record<string, string>> | null
  }

  export interface ToHtmlOptions {
    indent?: number
    indentSize?: number
    pretty?: boolean
  }

  export function toTestFormat(node: Node, options?: ToTestFormatOptions): string
  export function toHTML(node: Node, options?: ToHtmlOptions): string
}
