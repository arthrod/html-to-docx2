declare module 'justjshtml/src/index.js' {
  import type { FragmentContext } from 'justjshtml/src/context.js'
  import type { Node } from 'justjshtml/src/node.js'
  import type { ParseError } from 'justjshtml/src/tokens.js'
  import type { stream } from 'justjshtml/src/stream.js'

  export { FragmentContext }
  export { ParseError }
  export { stream }

  export interface JustHTML {
    errors?: ParseError[]
    root?: Node
  }

  export const JustHTML: {
    new (
      html: string,
      options?: {
        collectErrors?: boolean
        fragmentContext?: FragmentContext
        iframeSrcdoc?: boolean
      }
    ): JustHTML
  }
}
