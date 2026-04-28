# Releasing `context-debt`

This project uses a lightweight SemVer release flow and keeps release state in source control.

## Release checklist

1. Update `CHANGELOG.md` under `## [Unreleased]`.
2. Run `pnpm check`.
3. Run `pnpm smoke:package`.
4. Bump the package version:

```bash
pnpm version patch --no-git-tag-version
```

Use `patch`, `minor`, or `major` according to the public surface change.

5. Move the relevant `Unreleased` entries into a versioned section in `CHANGELOG.md`.
6. Commit the release prep.
7. Create a git tag that matches `package.json`, for example:

```bash
git tag v0.1.1
git push origin main --tags
```

8. Publish from a clean checkout after tags and CI are green:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm smoke:package
npm publish --access public
```

## Versioning guidance

- `patch`: docs-only fixes, false-positive reductions, non-breaking rule tuning, packaging fixes
- `minor`: new rules, new command flags, new JSON fields that are additive
- `major`: removed flags, changed exit semantics, renamed rules, breaking JSON schema changes

## Notes

- `prepublishOnly` already enforces `pnpm check && pnpm smoke:package`.
- `pnpm smoke:package` validates the packed tarball contents, not only the workspace source tree.
- Keep `CHANGELOG.md` human-readable; do not replace it with generated release notes only.
