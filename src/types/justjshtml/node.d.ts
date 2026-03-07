declare module 'justjshtml/src/node.js' {
  export type NodeAttributes = Readonly<Record<string, string>>

  export type NodeType = 'document' | 'documentType' | 'text' | 'comment' | 'element'

  export class Node {
    constructor(
      type: NodeType,
      options?: {
        attrs?: Record<string, string>
        children?: Node[]
        data?: string
        name?: string
        namespace?: string
      }
    )

    attrs?: NodeAttributes
    children: Node[]
    data?: string
    name?: string
    namespace?: string
    type: NodeType
  }
}
