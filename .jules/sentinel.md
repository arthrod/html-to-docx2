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

## 2025-05-17 - SSRF Vulnerability Via IPv6 Variations

**Vulnerability:** The application used `isPrivateOrLocalHost` to block private/local IPv4 addresses and the IPv6 loopback `[::1]`, but failed to check other IPv6 addresses like the unspecified address `[::]`, link-local `[fe80::/10]`, unique-local `[fc00::/7]`, and IPv4-mapped IPv6 addresses (e.g. `[::ffff:127.0.0.1]`). This allowed SSRF bypasses via IPv6 routing to local or private networks.
**Learning:** Checking only basic IPv4 representations and `[::1]` is insufficient, as network stacks will gladly map various IPv6 formats back to local internal networks (e.g. mapped IPv4s or link-local).
**Prevention:** Always validate IPv6 inputs thoroughly for SSRF prevention. Explicitly block `[::]`, link-local (`[fe80::/10]`), and unique-local (`[fc00::/7]`). Furthermore, extract inner IPv4 addresses from mapped IPv6 addresses (`[::ffff:<ipv4>]`) and pass them through the existing robust IPv4 validation logic.
