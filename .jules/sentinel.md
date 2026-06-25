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

## 2025-05-17 - SSRF Vulnerability via IPv6 and Negative IP Representations

**Vulnerability:** The `isPrivateOrLocalHost` function lacked comprehensive validation for all possible local and private IP representations. It could be bypassed by passing IPv6 variations like the unspecified address `[::]`, link-local addresses (e.g., `fe80::`), unique-local addresses (e.g., `fc00::`), IPv4-mapped IPv6 addresses (e.g., `[::ffff:127.0.0.1]`), and negative signed integer IP representations.
**Learning:** Checking for safe URL schemes and standard IPv4 formats is insufficient; the SSRF prevention check must handle IPv6 loopback, local/private ranges, and edge cases like negative 32-bit integer representations that bypass naive filters but are correctly evaluated by the underlying fetch logic.
**Prevention:** Implement strict regex validation for IPv6 local/private variations (such as `fc00::/7` and `fe80::/10`) and properly parse IPv4-mapped IPv6 strings (extracting the inner IP). Ensure test suites cover single-integer IPv4 addresses with both positive and negative representations.
## 2025-05-18 - CI Failures Due to Integrity Checking With `oxlint/oxfmt`

**Vulnerability:** CI jobs running `bun install --frozen-lockfile` fail sporadically with `error: Integrity check failed for tarball: oxlint-tsgolint`.
**Learning:** Post-install scripts or bindings downloaded dynamically during install phase by optional dependencies (like `@oxfmt/binding-linux-x64-gnu`) can trigger strict integrity verification issues in the runner environment.
**Prevention:** Avoid relying strictly on `--frozen-lockfile` if integrity mismatch continues to block CI, or explicitly pass `--ignore-scripts` to `bun install` during CI tasks where post-install triggers are non-essential for test execution.
