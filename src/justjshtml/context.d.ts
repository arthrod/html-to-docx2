declare module 'justjshtml/src/context.js' {
  export type FragmentNamespace = 'html' | 'math' | 'svg' | null

  export class FragmentContext {
    constructor(tagName: string, namespace?: FragmentNamespace)
    namespace: FragmentNamespace
    tag_name: string
    tagName: string
  }
}
