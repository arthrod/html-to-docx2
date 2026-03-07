declare module 'justjshtml/src/index.js' {
  type ParsedNode = {
    name: string
    data?: string
    attrs?: Record<string, string>
    children?: ParsedNode[]
    [key: string]: string | Record<string, string> | ParsedNode[] | undefined
  }

  type ParsedDocumentRoot = {
    children?: ParsedNode[]
  }

  export interface FragmentContext {}
  export const FragmentContext: {
    new (tagName: string): FragmentContext
  }

  export interface JustHTML {
    root?: ParsedDocumentRoot
  }
  export const JustHTML: {
    new (
      html: string,
      options?: {
        fragmentContext?: FragmentContext
      }
    ): JustHTML
  }
}
