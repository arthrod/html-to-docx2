declare module 'justjshtml/src/selector.js' {
  export type Namespace = 'html' | 'math' | 'svg' | null
  export type NodeAttributes = Readonly<Record<string, string>>

  export interface SelectorNode {
    attrs?: NodeAttributes | Readonly<Record<string, string | null>>
    children?: SelectorNode[]
    data?: string | null
    name?: string
    namespace?: Namespace
    parent?: SelectorNode | null
    templateContent?: SelectorNode | null
    template_content?: SelectorNode | null
  }

  export class SelectorError extends Error {
    constructor(message: string)
  }

  export function query(root: SelectorNode, selectorString: string): SelectorNode[]
  export function matches(node: SelectorNode, selectorString: string): boolean
}
