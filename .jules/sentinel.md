## 2024-05-15 - SSRF Vulnerability via Fetch

**Vulnerability:** The application uses `fetch()` directly on user-provided URLs in `src/utils/image.ts`, `src/utils/image-to-base64.ts`, and `src/utils/image-browser.ts` without validating the URL protocol. This allows `file://` protocols, leading to Local File Inclusion (LFI).
**Learning:** Naively passing strings to `fetch()` without a URL parse check enables unintended protocol resolution.
**Prevention:** Always parse URLs and assert an explicit allowlist (like `http:`, `https:`, `data:`, `blob:`) before invoking fetch. In this codebase, to support relative URLs without breaking them, use `try...catch` block that parses with a dummy base URL fallback. Ensure the generic `new Error(Invalid URL)` is thrown on failure so existing caching tests do not break.
## 2024-05-18 - Prevent XSS in SVG url() functional notations
**Vulnerability:** The SVG sanitizer only checked `href` and `xlink:href` attributes for dangerous protocols (like `javascript:`). It missed attributes like `fill`, `stroke`, `filter`, and `style` that support the `url()` CSS function, which can also execute dangerous protocols if rendered.
**Learning:** Checking for dangerous protocols needs to account for functional notations embedded inside CSS/SVG property values, not just direct attribute assignments.
**Prevention:** Always parse and sanitize the content of `url(...)` wrappers inside any SVG attribute that accepts external references (e.g., `fill`, `style`, `clip-path`).
