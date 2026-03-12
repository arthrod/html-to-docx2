declare module 'justjshtml/src/serialize.js' {
  export type FragmentNamespace = 'html' | 'math' | 'svg' | null
  export type NodeAttributes = Readonly<Record<string, string>>
  export interface DoctypeLike {
    forceQuirks: boolean
    name: string | null
    publicId: string | null
    systemId: string | null
  }

  export interface SerializableNode {
    attrs?: NodeAttributes
    children?: SerializableNode[]
    data?: string | DoctypeLike
    name: string
    namespace?: FragmentNamespace
    templateContent?: SerializableNode | null
    template_content?: SerializableNode | null
    toText?(options?: { separator?: string; strip?: boolean }): string
  }

  export interface ToTestFormatOptions {
    foreignAttributeAdjustments?: Readonly<Record<string, string>> | null
  }

  export interface ToHtmlOptions {
    indent?: number
    indentSize?: number
    pretty?: boolean
  }

  export function toTestFormat(
    node: SerializableNode,
    options?: ToTestFormatOptions
  ): string
  export function toHTML(node: SerializableNode, options?: ToHtmlOptions): string
}
