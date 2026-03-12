declare module 'justjshtml/src/node.js' {
  export type Namespace = 'html' | 'math' | 'svg' | null
  export type NodeName = string
  export type NodeAttributes = Readonly<Record<string, string | null>>

  export interface NodeTextOptions {
    separator?: string
    strip?: boolean
  }

  export interface NodeHtmlOptions {
    indent?: number
    indentSize?: number
    pretty?: boolean
  }

  export interface NodeInit {
    attrs?: Record<string, string | null> | null
    data?: string | null
    namespace?: Namespace
  }

  export class Node {
    constructor(name: NodeName, options?: NodeInit)

    attrs: NodeAttributes
    children: Node[]
    data: string | null
    name: NodeName
    namespace: Namespace
    parent: Node | null
    templateContent: Node | null
    template_content: Node | null

    readonly text: string

    appendChild(node: Node): void
    append_child(node: Node): void

    cloneNode(deep?: boolean): Node
    clone_node(deep?: boolean): Node

    hasChildNodes(): boolean
    has_child_nodes(): boolean

    insertBefore(node: Node, referenceNode: Node | null): void
    insert_before(node: Node, referenceNode: Node | null): void

    query(selector: string): Node[]

    removeChild(node: Node): void
    remove_child(node: Node): void

    replaceChild(newNode: Node, oldNode: Node): Node
    replace_child(newNode: Node, oldNode: Node): Node

    toHTML(options?: NodeHtmlOptions): string
    to_html(indent?: number, indentSize?: number, pretty?: boolean): string

    toMarkdown(): string
    to_markdown(): string

    toText(options?: NodeTextOptions): string
    to_text(options?: NodeTextOptions): string
  }
}
