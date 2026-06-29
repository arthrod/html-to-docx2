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

## 2025-05-17 - SSRF Vulnerability via IPv6 and Negative IPs

**Vulnerability:** The `isPrivateOrLocalHost` function did not properly validate IPv6 representations or handle negative 32-bit signed integer strings. This allowed SSRF bypasses via IPv6 unspecified/link-local/unique-local ranges (e.g. `[::]`, `[fe80::1]`, `[fc00::1]`), IPv4-mapped IPv6 (e.g. `[::ffff:127.0.0.1]`), and negative integer strings representing private IPs (e.g. `-1062731519` for `192.168.1.1`).
**Learning:** Checking explicit string matches or standard dotted-quad / positive octal formats is insufficient. Network stack behavior handles multiple representations of IPs, and the JavaScript bitwise right shift (`>>>`) converts negative string floats correctly for integer matching, but those strings must be validated alongside IPv6 variants.
**Prevention:** Implement comprehensive regex checks for IPv6 (link-local, unique-local, IPv4-mapped) alongside existing IPv4 parsing in hostname validation, and ensure tests account for negative signed integer representations of internal IP ranges.
