# Dependencies

## justjshtml (pinned GitHub commit)

- Package: `justjshtml`
- Source: `github:simonw/justjshtml#a415d0af40c34bf9a856e956d841513f482867e3`
- Reason for pin: the project currently depends on behavior from this exact upstream commit and there is no stable npm release covering the required API surface.

### Risks

- Upstream commit pins do not provide semver guarantees.
- Install reproducibility depends on GitHub availability and the commit remaining reachable.
- Security and bugfix visibility is lower than versioned registry releases.
- Automated dependency tooling (advisories/changelogs) is less effective for commit pins.

### Upgrade path

1. Track upstream `justjshtml` releases and migration notes.
2. Test a candidate tag/release on a dedicated branch by replacing the commit pin in `package.json`.
3. Run the full verification suite:
   - `bun run test:unit:coverage`
   - `bun run lint`
   - `bun run format:check`
   - `bun run build`
   - `bun run api:check`
4. Validate HTML parsing compatibility, especially `src/helpers/html-parser.ts` call sites.
5. If tests pass and behavior matches, switch to a versioned npm release and remove the commit pin.
