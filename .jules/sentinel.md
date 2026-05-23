## 2024-05-15 - SSRF Vulnerability via Fetch

**Vulnerability:** The application uses `fetch()` directly on user-provided URLs in `src/utils/image.ts`, `src/utils/image-to-base64.ts`, and `src/utils/image-browser.ts` without validating the URL protocol. This allows `file://` protocols, leading to Local File Inclusion (LFI).
**Learning:** Naively passing strings to `fetch()` without a URL parse check enables unintended protocol resolution.
**Prevention:** Always parse URLs and assert an explicit allowlist (like `http:`, `https:`, `data:`, `blob:`) before invoking fetch. In this codebase, to support relative URLs without breaking them, use `try...catch` block that parses with a dummy base URL fallback. Ensure the generic `new Error(Invalid URL)` is thrown on failure so existing caching tests do not break.

## 2024-05-23 - URL Functional Notation XSS Bypass in SVG

**Vulnerability:** The SVG sanitizer (`src/utils/svg-sanitizer.ts`) was only checking for dangerous protocols (like `javascript:`, `vbscript:`, `data:`) at the very beginning of the attribute value string using `String.prototype.startsWith` or simple regex tests on the trimmed value.
**Learning:** This approach completely misses malicious protocols nested inside functional notation like `url(...)`, which are natively supported in many SVG presentation attributes such as `style`, `fill`, `filter`, `clip-path`, and `mask`. An attacker can easily bypass the sanitizer by passing `fill="url(javascript:alert(1))"` or `style="background-image: url('javascript:alert(1)')"`.
**Prevention:** Always parse or explicitly extract URLs embedded in functional notation using non-greedy global regexes (e.g., `/url\(\s*(['"]?)(.*?)\1\s*\)/gi`) and apply protocol validation to the _inner_ extracted URIs. Ensure these checks apply comprehensively across all mapped URL-supporting attributes. Also enforce a strict whitelist for `data:` image MIME types.
