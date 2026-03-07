declare module 'justjshtml/src/selector.js' {
  import type { Node } from 'justjshtml/src/node.js'

  export class SelectorError extends Error {
    constructor(message: string)
  }

  export function query(root: Node, selectorString: string): Node[]
  export function matches(node: Node, selectorString: string): boolean
}
