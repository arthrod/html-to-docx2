import { decodeHTML } from "./encoding.js";
import { parseDocument } from "./parser.js";

export class StrictModeError extends SyntaxError {
  error: any;
  constructor(error: any) {
    super(error?.message || String(error?.code || "parse-error"));
    this.error = error;
  }
}

export class JustHTML {
  collectErrors: any;
  encoding: any;
  errors: any;
  fragmentContext: any;
  iframeSrcdoc: any;
  root: any;
  strict: any;
  constructor(input: any, options = {}) {
    const {
      // @ts-expect-error TS(2339) FIXME: Property 'collectErrors' does not exist on type '{... Remove this comment to see the full error message
      collectErrors = false,
      // @ts-expect-error TS(2339) FIXME: Property 'encoding' does not exist on type '{}'.
      encoding = null,
      // @ts-expect-error TS(2339) FIXME: Property 'strict' does not exist on type '{}'.
      strict = false,
      // @ts-expect-error TS(2339) FIXME: Property 'fragmentContext' does not exist on type ... Remove this comment to see the full error message
      fragmentContext = null,
      // @ts-expect-error TS(2339) FIXME: Property 'iframeSrcdoc' does not exist on type '{}... Remove this comment to see the full error message
      iframeSrcdoc = false,
      // @ts-expect-error TS(2339) FIXME: Property 'tokenizerOpts' does not exist on type '{... Remove this comment to see the full error message
      tokenizerOpts = null,
    } = options;

    this.encoding = null;
    this.errors = [];
    this.fragmentContext = fragmentContext;

    let html = input;
    if (html == null) html = "";

    if (typeof html === "string") {
      // Already decoded.
    } else if (html instanceof ArrayBuffer) {
      const bytes = new Uint8Array(html);
      const decoded = decodeHTML(bytes, { transportEncoding: encoding });
      this.encoding = decoded.encoding;
      html = decoded.text;
    } else if (html instanceof Uint8Array) {
      const decoded = decodeHTML(html, { transportEncoding: encoding });
      this.encoding = decoded.encoding;
      html = decoded.text;
    } else {
      html = String(html);
    }

    const shouldCollect = Boolean(collectErrors) || Boolean(strict);
    const parsed = parseDocument(html, {
      fragmentContext,
      iframeSrcdoc: Boolean(iframeSrcdoc),
      collectErrors: shouldCollect,
      tokenizerOpts,
    });
    this.root = parsed.root;
    this.errors = parsed.errors;

    this.collectErrors = Boolean(collectErrors);
    this.strict = Boolean(strict);
    this.iframeSrcdoc = Boolean(iframeSrcdoc);

    if (this.strict && this.errors.length) {
      throw new StrictModeError(this.errors[0]);
    }
  }

  toText(options: any) {
    return this.root.toText(options);
  }

  to_text(options: any) {
    return this.toText(options);
  }

  toHTML(options: any) {
    return this.root.toHTML(options);
  }

  to_html(indent = 0, indentSize = 2, pretty = true) {
    return this.toHTML({ indent, indentSize, pretty });
  }

  query(selector: any) {
    return this.root.query(selector);
  }

  toMarkdown() {
    return this.root.toMarkdown();
  }

  to_markdown() {
    return this.toMarkdown();
  }
}
