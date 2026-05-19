## 2024-05-15 - SSRF Vulnerability via Fetch

**Vulnerability:** The application uses `fetch()` directly on user-provided URLs in `src/utils/image.ts`, `src/utils/image-to-base64.ts`, and `src/utils/image-browser.ts` without validating the URL protocol. This allows `file://` protocols, leading to Local File Inclusion (LFI).
**Learning:** Naively passing strings to `fetch()` without a URL parse check enables unintended protocol resolution.
**Prevention:** Always parse URLs and assert an explicit allowlist (like `http:`, `https:`, `data:`, `blob:`) before invoking fetch. In this codebase, to support relative URLs without breaking them, use `try...catch` block that parses with a dummy base URL fallback. Ensure the generic `new Error(Invalid URL)` is thrown on failure so existing caching tests do not break.
## 2025-02-27 - XSS via SVG url() notations
**Vulnerability:** XSS payloads embedded inside `url()` functional notation in CSS properties (e.g. `fill`, `style`, `stroke`) on SVG elements were bypassing sanitization.
**Learning:** `hasDangerousProtocol` was only applied directly to values of `href` and `xlink:href` attributes. It missed nested protocols within standard CSS-like attributes that parse functional URLs.
**Prevention:** Extract all `url(...)` declarations globally via regex `/url\(\s*['"]?(.*?)['"]?\s*\)/gis` across all `URL_ATTRIBUTES` (`fill`, `stroke`, `filter`, `clip-path`, `mask`, `style`) and block the entire attribute if any inner URI uses a dangerous protocol like `javascript:`.
