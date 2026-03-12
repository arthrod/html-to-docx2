declare module 'justjshtml/src/markdown.js' {
  import type { Node } from 'justjshtml/src/node.js'

  export function toMarkdown(node: Node): string
}
