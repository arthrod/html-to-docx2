## 2024-05-15 - SSRF Vulnerability via Fetch

**Vulnerability:** The application uses `fetch()` directly on user-provided URLs in `src/utils/image.ts`, `src/utils/image-to-base64.ts`, and `src/utils/image-browser.ts` without validating the URL protocol. This allows `file://` protocols, leading to Local File Inclusion (LFI).
**Learning:** Naively passing strings to `fetch()` without a URL parse check enables unintended protocol resolution.
**Prevention:** Always parse URLs and assert an explicit allowlist (like `http:`, `https:`, `data:`, `blob:`) before invoking fetch. In this codebase, to support relative URLs without breaking them, use `try...catch` block that parses with a dummy base URL fallback. Ensure the generic `new Error(Invalid URL)` is thrown on failure so existing caching tests do not break.
## 2025-02-12 - Fix XSS bypass in SVG functional notation
**Vulnerability:** Attackers could bypass the `hasDangerousProtocol` check (which blocks `javascript:`) by nesting the payload inside `url(...)` or `background: url(...)` because the regex only checked the start of the string (`/^\s*(javascript...)/i`).
**Learning:** Checking for malicious protocols only at the start of strings is insufficient for SVG attributes supporting functional notation (e.g., `style`, `fill`). Furthermore, `data:` protocols were entirely blocked for `href`, limiting functionality, while being unchecked for other URL attributes.
**Prevention:** Always maintain a strict mapping of `URL_ATTRIBUTES`, extract inner URLs using non-greedy global regexes (like `/url\s*\(\s*(['"]?)(.*?)\1\s*\)/gi`), and explicitly whitelist safe `data:` image MIME types (e.g., `image/png`) instead of using blacklists or overly broad checks.
