declare module 'justjshtml/src/selector.js' {
  import type { NodeAttributes } from 'justjshtml/src/node.js'

  export interface SelectorNode {
    attrs?: NodeAttributes
    children?: SelectorNode[]
    data?: string
    name?: string
    templateContent?: SelectorNode | null
    template_content?: SelectorNode | null
  }

  export class SelectorError extends Error {
    constructor(message: string)
  }

  export function query(root: SelectorNode, selectorString: string): SelectorNode[]
  export function matches(node: SelectorNode, selectorString: string): boolean
}
