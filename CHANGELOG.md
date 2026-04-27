# Changelog

All notable changes to CHROMALUM are documented in this file.

This project follows semantic versioning in practice:

- **Patch:** bug fixes, copy fixes, test additions, dependency updates.
- **Minor:** new UI capabilities, tabs, diagrams, or non-breaking workflows.
- **Major:** breaking changes to saved data, public URLs, or core interaction
  models.

## [5.4.1] - 2026-04-27

### Added

- Public project presentation pass: screenshots, feature summary, design
  intent, architecture map, and quality-gate documentation in the README.
- GitHub Pages demo link and repository metadata alignment.
- Release notes baseline for future version/tag consistency.

### Changed

- Reorganized source files into domain folders and colocated test files under
  matching `__tests__/` directories.
- Clarified source-code and documentation licensing boundaries.
- Strengthened quality gates with format checks, coverage reporting, Playwright
  end-to-end coverage, Dependabot, CodeQL, and pinned GitHub Actions.

### Fixed

- React hook dependency warnings.
- Gallery thumbnail staleness after strokes that missed sampled pixels.
- Android image file loading.
- Recent documentation audit findings and citation guidance.

### Verified

- `npm run lint`
- `npm run format:check`
- `npm run build`
- `npm run test:coverage`
- `npm run test:e2e`
- `npm audit --audit-level=moderate`

[5.4.1]: https://github.com/humannnnn1-bot/chromalum/releases/tag/v5.4.1
