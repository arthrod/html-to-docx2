## 2024-05-15 - SSRF Vulnerability via Fetch

**Vulnerability:** The application uses `fetch()` directly on user-provided URLs in `src/utils/image.ts`, `src/utils/image-to-base64.ts`, and `src/utils/image-browser.ts` without validating the URL protocol. This allows `file://` protocols, leading to Local File Inclusion (LFI).
**Learning:** Naively passing strings to `fetch()` without a URL parse check enables unintended protocol resolution.
**Prevention:** Always parse URLs and assert an explicit allowlist (like `http:`, `https:`, `data:`, `blob:`) before invoking fetch. In this codebase, to support relative URLs without breaking them, use `try...catch` block that parses with a dummy base URL fallback. Ensure the generic `new Error(Invalid URL)` is thrown on failure so existing caching tests do not break.

## 2024-05-21 - XSS via unvalidated url() in SVG attributes
**Vulnerability:** The `svg-sanitizer.ts` only checked for dangerous protocols on `href` and `xlink:href` attributes directly. It missed other URL-supporting attributes like `fill`, `filter`, `style`, `clip-path`, and `mask`, which can contain `url(javascript:alert(1))` values that execute XSS payloads.
**Learning:** URL sanitization must cover *all* attributes that support functional URL notation (`url(...)`), not just explicit hyperlink attributes. Furthermore, a single string can contain multiple `url(...)` declarations, and a regex check is necessary to isolate and validate the inner strings.
**Prevention:** Maintain a comprehensive `URL_ATTRIBUTES` whitelist. When sanitizing these attributes, extract all `url(...)` contents using a global regex check (`URL_FUNCTION_REGEX`) to validate each inner string against `DANGEROUS_PROTOCOLS`. Additionally, strict whitelisting must apply to `data:` URIs (restricting them to safe image types).
