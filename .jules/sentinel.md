## 2024-05-15 - SSRF Vulnerability via Fetch

**Vulnerability:** The application uses `fetch()` directly on user-provided URLs in `src/utils/image.ts`, `src/utils/image-to-base64.ts`, and `src/utils/image-browser.ts` without validating the URL protocol. This allows `file://` protocols, leading to Local File Inclusion (LFI).
**Learning:** Naively passing strings to `fetch()` without a URL parse check enables unintended protocol resolution.
**Prevention:** Always parse URLs and assert an explicit allowlist (like `http:`, `https:`, `data:`, `blob:`) before invoking fetch. In this codebase, to support relative URLs without breaking them, use `try...catch` block that parses with a dummy base URL fallback. Ensure the generic `new Error(Invalid URL)` is thrown on failure so existing caching tests do not break.
## 2024-05-16 - SSRF Vulnerability via Internal IP addresses

**Vulnerability:** The application uses `fetch()` on validated `http:` and `https:` URLs but does not check the hostname for private or local networks (e.g. `127.0.0.1`, `localhost`, `10.x.x.x`), allowing attackers to scan or access internal services.
**Learning:** Checking URL protocols isn't enough to prevent SSRF. The destination hostname must be evaluated. Attackers can bypass naive checks using IPv6, mapped IPv4, and alternative string formats (like integers or hex). The URL object normalizes these to some extent, making the IP regex checks more reliable.
**Prevention:** Always validate the `hostname` of parsed URLs against a comprehensive list of private network ranges and loopback addresses before making outward `fetch()` requests.
