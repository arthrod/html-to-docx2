import { VOID_ELEMENTS } from "./constants.js";

function attrListToDict(attrs: any) {
  if (!attrs) return {};
  if (!Array.isArray(attrs) && typeof attrs === "object") return attrs;
  if (!Array.isArray(attrs)) return {};

  const out = {};
  for (const entry of attrs) {
    if (!entry || typeof entry !== "object") continue;
    const name = entry.name;
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    out[name] = Object.prototype.hasOwnProperty.call(entry, "value") ? entry.value : null;
  }
  return out;
}

function escapeText(text: any) {
  if (!text) return "";
  return String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttrValue(value: any, quoteChar: any, escapeLtInAttrs: any) {
  if (value == null) return "";
  let out = String(value).replaceAll("&", "&amp;");
  if (escapeLtInAttrs) out = out.replaceAll("<", "&lt;");
  if (quoteChar === '"') return out.replaceAll('"', "&quot;");
  return out.replaceAll("'", "&#39;");
}

function chooseAttrQuote(value: any, forcedQuoteChar = null) {
  if (forcedQuoteChar === '"' || forcedQuoteChar === "'") return forcedQuoteChar;
  if (value == null) return '"';
  const s = String(value);
  if (s.includes('"') && !s.includes("'")) return "'";
  return '"';
}

function canUnquoteAttrValue(value: any) {
  if (value == null) return false;
  const s = String(value);
  for (const ch of s) {
    if (ch === ">") return false;
    if (ch === '"' || ch === "'" || ch === "=") return false;
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\f" || ch === "\r") return false;
  }
  return true;
}

function shouldMinimizeAttrValue(name: any, value: any, minimizeBooleanAttributes: any) {
  if (!minimizeBooleanAttributes) return false;
  if (value == null || value === "") return true;
  return String(value).toLowerCase() === String(name).toLowerCase();
}

function serializeStartTag(name: any, attrs: any, options: any, isVoid: any) {
  const quoteAttrValues = Boolean(options.quote_attr_values);
  const minimizeBooleanAttributes =
    options.minimize_boolean_attributes === undefined ? true : Boolean(options.minimize_boolean_attributes);
  const useTrailingSolidus = Boolean(options.use_trailing_solidus);
  const escapeLtInAttrs = Boolean(options.escape_lt_in_attrs);
  const forcedQuote = options.quote_char ?? null;

  const parts = ["<", name];

  if (attrs && Object.keys(attrs).length) {
    const keys = Object.keys(attrs).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    for (const key of keys) {
      let value = attrs[key];

      if (shouldMinimizeAttrValue(key, value, minimizeBooleanAttributes)) {
        parts.push(" ", key);
        continue;
      }

      if (value == null) {
        parts.push(" ", key, '=""');
        continue;
      }

      value = String(value);
      if (value === "") {
        if (minimizeBooleanAttributes) parts.push(" ", key);
        else parts.push(" ", key, '=""');
        continue;
      }

      if (!quoteAttrValues && canUnquoteAttrValue(value)) {
        let escaped = value.replaceAll("&", "&amp;");
        if (escapeLtInAttrs) escaped = escaped.replaceAll("<", "&lt;");
        parts.push(" ", key, "=", escaped);
        continue;
      }

      const quote = chooseAttrQuote(value, forcedQuote);
      const escaped = escapeAttrValue(value, quote, escapeLtInAttrs);
      parts.push(" ", key, "=", quote, escaped, quote);
    }
  }

  if (useTrailingSolidus && isVoid) parts.push(" />");
  else parts.push(">");

  return parts.join("");
}

function stripWhitespace(text: any) {
  if (!text) return "";
  const out = [];
  let lastSpace = false;
  for (const ch of String(text)) {
    const mapped = ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" ? " " : ch;
    if (mapped === " ") {
      if (lastSpace) continue;
      lastSpace = true;
      out.push(" ");
    } else {
      lastSpace = false;
      out.push(mapped);
    }
  }
  return out.join("");
}

function updateMetaContentTypeCharset(content: any, encoding: any) {
  if (content == null) return null;
  if (!encoding) return content;
  const s = String(content);
  const lower = s.toLowerCase();
  const idx = lower.indexOf("charset=");
  if (idx === -1) return s;

  const start = idx + "charset=".length;
  let end = start;
  while (end < s.length) {
    const ch = s[end];
    if (ch === ";" || ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f") break;
    end += 1;
  }
  return s.slice(0, start) + String(encoding) + s.slice(end);
}

function applyInjectMetaCharset(tokens: any, encoding: any) {
  if (!encoding) return [];

  let sawHead = false;
  let inHead = false;
  let contentTokens = [];

  for (const tok of tokens) {
    const kind = tok?.[0];
    if (!inHead) {
      if (kind === "StartTag" && tok?.[2] === "head") {
        sawHead = true;
        inHead = true;
      }
      continue;
    }
    if (kind === "EndTag" && tok?.[2] === "head") break;
    contentTokens.push(tok);
  }

  if (!sawHead) contentTokens = [...tokens];

  const processed = [];
  let foundCharset = false;

  for (const tok of contentTokens) {
    if (tok?.[0] === "EmptyTag" && tok?.[1] === "meta") {
      const attrs = attrListToDict(tok?.[2] ?? {});
      if (Object.prototype.hasOwnProperty.call(attrs, "charset")) {
        attrs.charset = encoding;
        foundCharset = true;
      } else if (String(attrs["http-equiv"] || "").toLowerCase() === "content-type" && "content" in attrs) {
        attrs.content = updateMetaContentTypeCharset(attrs.content, encoding);
        foundCharset = true;
      }
      processed.push(["EmptyTag", "meta", attrs]);
    } else {
      processed.push(tok);
    }
  }

  if (!foundCharset) processed.unshift(["EmptyTag", "meta", { charset: encoding }]);
  return processed;
}

function tokName(tok: any) {
  if (!tok) return null;
  const kind = tok[0];
  if (kind === "StartTag") return tok[2];
  if (kind === "EndTag") return tok[2];
  if (kind === "EmptyTag") return tok[1];
  return null;
}

function tokIsSpaceChars(tok: any) {
  return tok != null && tok[0] === "Characters" && String(tok[1] || "").startsWith(" ");
}

function shouldOmitStartTag(name: any, attrs: any, prevTok: any, nextTok: any) {
  if (attrs && Object.keys(attrs).length) return false;

  if (name === "html") {
    if (nextTok == null) return true;
    if (nextTok[0] === "Comment" || tokIsSpaceChars(nextTok)) return false;
    if (nextTok[0] === "Characters" && nextTok[1] === "") return false;
    return true;
  }

  if (name === "head") {
    if (nextTok == null) return true;
    if (nextTok[0] === "Comment" || nextTok[0] === "Characters") return false;
    if (nextTok[0] === "EndTag" && tokName(nextTok) === "head") return true;
    if (nextTok[0] === "StartTag" || nextTok[0] === "EmptyTag" || nextTok[0] === "EndTag") return true;
    return false;
  }

  if (name === "body") {
    if (nextTok == null) return true;
    if (nextTok[0] === "Comment" || tokIsSpaceChars(nextTok)) return false;
    return true;
  }

  if (name === "colgroup") {
    if (prevTok != null && prevTok[0] === "StartTag" && tokName(prevTok) === "table") {
      if (nextTok != null && (nextTok[0] === "StartTag" || nextTok[0] === "EmptyTag") && tokName(nextTok) === "col") {
        return true;
      }
    }
    return false;
  }

  if (name === "tbody") {
    if (prevTok != null && prevTok[0] === "StartTag" && tokName(prevTok) === "table") {
      if (nextTok != null && nextTok[0] === "StartTag" && tokName(nextTok) === "tr") return true;
    }
    return false;
  }

  return false;
}

function shouldOmitEndTag(name: any, nextTok: any) {
  if (name === "html" || name === "head" || name === "body" || name === "colgroup") {
    if (nextTok == null) return true;
    if (nextTok[0] === "Comment" || tokIsSpaceChars(nextTok)) return false;
    if (nextTok[0] === "StartTag" || nextTok[0] === "EmptyTag" || nextTok[0] === "EndTag") return true;
    if (nextTok[0] === "Characters") return !String(nextTok[1] || "").startsWith(" ");
    return true;
  }

  if (name === "li") {
    if (nextTok == null) return true;
    if (nextTok[0] === "StartTag" && tokName(nextTok) === "li") return true;
    if (nextTok[0] === "EndTag") return true;
    return false;
  }

  if (name === "dt") {
    if (nextTok == null) return false;
    if (nextTok[0] === "StartTag" && (tokName(nextTok) === "dt" || tokName(nextTok) === "dd")) return true;
    return false;
  }

  if (name === "dd") {
    if (nextTok == null) return true;
    if (nextTok[0] === "StartTag" && (tokName(nextTok) === "dd" || tokName(nextTok) === "dt")) return true;
    if (nextTok[0] === "EndTag") return true;
    return false;
  }

  if (name === "p") {
    if (nextTok == null) return true;
    if (nextTok[0] === "EndTag") return true;
    if (nextTok[0] === "StartTag" || nextTok[0] === "EmptyTag") {
      const nextName = tokName(nextTok);
      if (
        nextName === "address" ||
        nextName === "article" ||
        nextName === "aside" ||
        nextName === "blockquote" ||
        nextName === "datagrid" ||
        nextName === "dialog" ||
        nextName === "dir" ||
        nextName === "div" ||
        nextName === "dl" ||
        nextName === "fieldset" ||
        nextName === "footer" ||
        nextName === "form" ||
        nextName === "h1" ||
        nextName === "h2" ||
        nextName === "h3" ||
        nextName === "h4" ||
        nextName === "h5" ||
        nextName === "h6" ||
        nextName === "header" ||
        nextName === "hr" ||
        nextName === "menu" ||
        nextName === "nav" ||
        nextName === "ol" ||
        nextName === "p" ||
        nextName === "pre" ||
        nextName === "section" ||
        nextName === "table" ||
        nextName === "ul"
      ) {
        return true;
      }
    }
    return false;
  }

  if (name === "optgroup") {
    if (nextTok == null) return true;
    if (nextTok[0] === "StartTag" && tokName(nextTok) === "optgroup") return true;
    if (nextTok[0] === "EndTag") return true;
    return false;
  }

  if (name === "option") {
    if (nextTok == null) return true;
    if (nextTok[0] === "StartTag" && (tokName(nextTok) === "option" || tokName(nextTok) === "optgroup")) return true;
    if (nextTok[0] === "EndTag") return true;
    return false;
  }

  if (name === "tbody") {
    if (nextTok == null) return true;
    if (nextTok[0] === "StartTag" && (tokName(nextTok) === "tbody" || tokName(nextTok) === "tfoot")) return true;
    if (nextTok[0] === "EndTag") return true;
    return false;
  }

  if (name === "tfoot") {
    if (nextTok == null) return true;
    if (nextTok[0] === "StartTag" && tokName(nextTok) === "tbody") return true;
    if (nextTok[0] === "EndTag") return true;
    return false;
  }

  if (name === "thead") {
    if (nextTok != null && nextTok[0] === "StartTag" && (tokName(nextTok) === "tbody" || tokName(nextTok) === "tfoot"))
      return true;
    return false;
  }

  if (name === "tr") {
    if (nextTok == null) return true;
    if (nextTok[0] === "StartTag" && tokName(nextTok) === "tr") return true;
    if (nextTok[0] === "EndTag") return true;
    return false;
  }

  if (name === "td" || name === "th") {
    if (nextTok == null) return true;
    if (nextTok[0] === "StartTag" && (tokName(nextTok) === "td" || tokName(nextTok) === "th")) return true;
    if (nextTok[0] === "EndTag") return true;
    return false;
  }

  return false;
}

export function serializeSerializerTokenStream(tokens: any, options = {}) {
  if (!Array.isArray(tokens)) return null;

  let tokenStream = tokens;
  // @ts-expect-error TS(2339) FIXME: Property 'inject_meta_charset' does not exist on t... Remove this comment to see the full error message
  if (options.inject_meta_charset) {
    // @ts-expect-error TS(2339) FIXME: Property 'encoding' does not exist on type '{}'.
    const encoding = options.encoding;
    if (!encoding) return "";
    tokenStream = applyInjectMetaCharset(tokenStream, encoding);
  }

  const parts = [];
  let rawtext = null;

  const openElements = [];
  // @ts-expect-error TS(2339) FIXME: Property 'strip_whitespace' does not exist on type... Remove this comment to see the full error message
  const stripWs = Boolean(options.strip_whitespace);
  // @ts-expect-error TS(2339) FIXME: Property 'escape_rcdata' does not exist on type '{... Remove this comment to see the full error message
  const escapeRcdata = Boolean(options.escape_rcdata);
  const wsPreserve = new Set(["pre", "textarea", "script", "style"]);

  for (let i = 0; i < tokenStream.length; i += 1) {
    const t = tokenStream[i];
    const prevTok = i ? tokenStream[i - 1] : null;
    const nextTok = i + 1 < tokenStream.length ? tokenStream[i + 1] : null;

    const kind = t?.[0];
    if (kind === "StartTag") {
      const name = t[2];
      const attrs = attrListToDict(t.length > 3 ? t[3] : {});

      openElements.push(name);

      if (shouldOmitStartTag(name, attrs, prevTok, nextTok)) continue;

      parts.push(serializeStartTag(name, attrs, options, VOID_ELEMENTS.has(name)));
      if ((name === "script" || name === "style") && !escapeRcdata) rawtext = name;
      continue;
    }

    if (kind === "EndTag") {
      const name = t[2];

      if (openElements.length) {
        if (openElements[openElements.length - 1] === name) {
          openElements.pop();
        } else {
          for (let j = openElements.length - 1; j >= 0; j -= 1) {
            if (openElements[j] === name) {
              openElements.splice(j);
              break;
            }
          }
        }
      }

      if (shouldOmitEndTag(name, nextTok)) continue;

      parts.push(`</${name}>`);
      if (rawtext === name) rawtext = null;
      continue;
    }

    if (kind === "EmptyTag") {
      const name = t[1];
      const attrs = t.length > 2 ? t[2] : {};
      parts.push(serializeStartTag(name, attrListToDict(attrs), options, true));
      continue;
    }

    if (kind === "Characters") {
      if (rawtext != null) {
        parts.push(String(t[1] ?? ""));
        continue;
      }

      let text = String(t[1] ?? "");
      if (stripWs && !openElements.some((n) => wsPreserve.has(n))) text = stripWhitespace(text);
      parts.push(escapeText(text));
      continue;
    }

    if (kind === "Comment") {
      parts.push(`<!--${t[1] ?? ""}-->`);
      continue;
    }

    if (kind === "Doctype") {
      const name = t.length > 1 ? String(t[1] ?? "") : "";
      const publicId = t.length > 2 ? t[2] : null;
      const systemId = t.length > 3 ? t[3] : null;

      if (publicId == null && systemId == null) {
        parts.push(`<!DOCTYPE ${name}>`);
      } else {
        const hasPublic = publicId != null && publicId !== "";
        const hasSystem = systemId != null && systemId !== "";
        if (hasPublic) {
          if (hasSystem) parts.push(`<!DOCTYPE ${name} PUBLIC "${publicId}" "${systemId}">`);
          else parts.push(`<!DOCTYPE ${name} PUBLIC "${publicId}">`);
        } else if (hasSystem) {
          parts.push(`<!DOCTYPE ${name} SYSTEM "${systemId}">`);
        } else {
          parts.push(`<!DOCTYPE ${name}>`);
        }
      }
      continue;
    }

    return null;
  }

  return parts.join("");
}
