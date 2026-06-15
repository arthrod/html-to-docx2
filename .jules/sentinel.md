## 2024-05-15 - SSRF Vulnerability via Fetch

**Vulnerability:** The application uses `fetch()` directly on user-provided URLs in `src/utils/image.ts`, `src/utils/image-to-base64.ts`, and `src/utils/image-browser.ts` without validating the URL protocol. This allows `file://` protocols, leading to Local File Inclusion (LFI).
**Learning:** Naively passing strings to `fetch()` without a URL parse check enables unintended protocol resolution.
**Prevention:** Always parse URLs and assert an explicit allowlist (like `http:`, `https:`, `data:`, `blob:`) before invoking fetch. In this codebase, to support relative URLs without breaking them, use `try...catch` block that parses with a dummy base URL fallback. Ensure the generic `new Error(Invalid URL)` is thrown on failure so existing caching tests do not break.

## 2024-05-31 - SVG URL Protocol Bypass via url() Notation

**Vulnerability:** The SVG sanitizer (`hasDangerousProtocol`) failed to extract and inspect protocols inside `url(...)` CSS functions, which are valid in attributes like `style`, `fill`, `filter`, etc. This allowed attackers to bypass checks using payloads like `style="background: url(javascript:alert(1))"`.
**Learning:** String prefix checks (`startsWith`, `test`) on the entire attribute value are insufficient because functional notations nest the actual target URI. Attackers can conceal dangerous protocols deeper within the string.
**Prevention:** Always extract embedded URIs using regex (e.g. `/url\(\s*(['"]?)(.*?)\1\s*\)/g`) and apply protocol validation logic strictly to the extracted inner URI, rather than the raw outer string. Also ensure a robust safe data URI regex (`/^\s*data:image\/(png|jpeg|gif|webp|bmp);base64,/i`) is explicitly enforced.

## 2025-05-16 - SSRF Vulnerability Via Private IP Access

**Vulnerability:** Even when URL protocols were restricted to HTTP/HTTPS, image fetching functions did not validate the destination hostname. This allowed Server-Side Request Forgery (SSRF) against internal resources (e.g. `localhost`, `127.0.0.1`, `169.254.169.254`), including bypassed IP formats (like octal/hex).
**Learning:** Checking for safe URL schemes isn't enough; the destination host itself must be verified to prevent SSRF against loopback addresses and private networks.
**Prevention:** Implement an IP/hostname validator (like `isPrivateOrLocalHost`) before sending outbound requests to block known local and private IP ranges.

## 2025-05-17 - SSRF Vulnerability Via IPv6 Localhost Variations Bypass

**Vulnerability:** The application's SSRF protection `isPrivateOrLocalHost` function previously only validated IPv4 localhost variations and the strict IPv6 `[::1]` string. It failed to block equivalent IPv6 formats like the unspecified address `[::]`, link-local (`[fe80::1]`), unique-local (`[fc00::1]`), or IPv4-mapped IPv6 formats (e.g. `[::ffff:127.0.0.1]`), allowing SSRF bypasses via IPv6.
**Learning:** Checking for `[::1]` string literal is insufficient for complete IPv6 SSRF protection. Attackers can map local IPv4 addresses into IPv6 blocks or use alternative IPv6 loopback variants to bypass basic string checks.
**Prevention:** To prevent SSRF bypasses when validating local/private hostnames, check for IPv6 variations including the unspecified address `[::]`, use regex to catch link-local (`/^\[fe[89ab][0-9a-f]:/i`) and unique-local (`/^\[f[cd][0-9a-f]{2}:/i`) ranges, and extract/validate the inner IPv4 address from IPv4-mapped IPv6 addresses (e.g. `[::ffff:127.0.0.1]`).
