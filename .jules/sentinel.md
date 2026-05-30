## 2024-05-15 - SSRF Vulnerability via Fetch

**Vulnerability:** The application uses `fetch()` directly on user-provided URLs in `src/utils/image.ts`, `src/utils/image-to-base64.ts`, and `src/utils/image-browser.ts` without validating the URL protocol. This allows `file://` protocols, leading to Local File Inclusion (LFI).
**Learning:** Naively passing strings to `fetch()` without a URL parse check enables unintended protocol resolution.
**Prevention:** Always parse URLs and assert an explicit allowlist (like `http:`, `https:`, `data:`, `blob:`) before invoking fetch. In this codebase, to support relative URLs without breaking them, use `try...catch` block that parses with a dummy base URL fallback. Ensure the generic `new Error(Invalid URL)` is thrown on failure so existing caching tests do not break.

## 2024-06-25 - XSS Vulnerability in SVG Sanitization via URL Functional Notation

**Vulnerability:** The SVG sanitizer (`src/utils/svg-sanitizer.ts`) previously only checked for dangerous protocols in `href` and `xlink:href` attributes, and outright blocked `data:` URIs even for safe images. This allowed attackers to bypass protocol sanitization by nesting payloads inside `url(...)` or `background: url(...)` in attributes like `style`, `fill`, etc.
**Learning:** Checking for malicious protocols only at the attribute value level is insufficient when SVG attributes support functional notation, such as `url()`.
**Prevention:** Always maintain a strict mapping of `URL_ATTRIBUTES`, extract inner URLs using non-greedy global regexes (e.g., `/url\(\s*['"]?(.*?)['"]?\s*\)/gi`), and validate them. Explicitly whitelist safe `data:` image MIME types instead of blocking all `data:` URIs.
