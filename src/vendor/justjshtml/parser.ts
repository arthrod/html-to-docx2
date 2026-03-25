import { Tokenizer, TokenizerOpts } from './tokenizer.js'
import { TreeBuilder } from './treebuilder.js'

export interface ParseDocumentOptions {
  fragmentContext?: any // It's an element node from dom, left as any since we don't have its type here without more refactoring
  iframeSrcdoc?: boolean
  collectErrors?: boolean
  tokenizerOpts?: TokenizerOpts | null
}

export function parseDocument(html: any, options: ParseDocumentOptions = {}) {
  const {
    fragmentContext = null,
    iframeSrcdoc = false,
    collectErrors = false,
    tokenizerOpts = null,
  } = options

  const shouldCollect = Boolean(collectErrors)
  const treeBuilder = new TreeBuilder(fragmentContext, iframeSrcdoc, shouldCollect)
  // @ts-expect-error TS(2551) FIXME: Property 'openElements' does not exist on type 'Tr... Remove this comment to see the full error message
  treeBuilder.openElements = treeBuilder.open_elements

  const opts =
    tokenizerOpts instanceof TokenizerOpts
      ? tokenizerOpts
      : new TokenizerOpts(tokenizerOpts || {})

  // Match justhtml's fragment tokenizer state overrides.
  if (fragmentContext && !fragmentContext.namespace) {
    const tagName = (
      fragmentContext.tag_name ||
      fragmentContext.tagName ||
      ''
    ).toLowerCase()
    if (tagName === 'textarea' || tagName === 'title' || tagName === 'style') {
      opts.initialState = Tokenizer.RAWTEXT
      opts.initialRawtextTag = tagName
    } else if (tagName === 'plaintext' || tagName === 'script') {
      opts.initialState = Tokenizer.PLAINTEXT
      opts.initialRawtextTag = null
    }
  }

  const tokenizer = new Tokenizer(treeBuilder, opts, { collectErrors: shouldCollect })
  treeBuilder.tokenizer = tokenizer

  tokenizer.run(html || '')
  const root = treeBuilder.finish()
  const errors = [...tokenizer.errors, ...treeBuilder.errors]

  return { root, errors, tokenizer, treeBuilder }
}
