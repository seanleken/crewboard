# Contributing to CrewBoard

Thanks for your interest in contributing. This is a small focused project — contributions that fit the scope are welcome.

## What's in scope

- Bug fixes
- New airlines or aircraft families (edit the JSON config files)
- UI/UX improvements that stay within the existing design system
- Performance improvements to the schedule generation algorithm
- Seed script improvements (new endpoints, better deduplication, etc.)

## What's out of scope (for now)

See the "Future Considerations" section of the technical brief. Things like SimBrief integration, career mode, and flight tracking are intentionally deferred.

## Setup

Follow the [README](./README.md) to get the project running locally. You'll need a Neon database and some seeded route data to work with the schedule generator.

## Making changes

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run `npx tsc --noEmit` to check for type errors before opening a PR
4. Open a pull request with a clear description of what changed and why

## Code style

- **No new dependencies** without discussion — the dependency list is intentionally lean
- **No component libraries** — UI is hand-built with Tailwind v3
- **No form libraries** — native forms or simple `useState`
- Follow existing patterns: server components for data fetching, client components for interactivity, `router.refresh()` to sync after mutations
- ICAO codes and flight numbers always in `font-mono`

## Config changes (airlines / aircraft families)

To add an airline:
1. Add an entry to `config/airlines.json` with the ICAO code, name, and hub airports
2. Run `npm run seed <ICAO>` to populate route data
3. Open a PR — include a note on which aircraft families the airline operates (so reviewers can verify it'll generate valid schedules)

To add an aircraft family:
1. Add an entry to `config/aircraft-families.json` with an `id`, `name`, and list of ICAO type codes
2. Re-seed any airlines that operate that family

## Questions

Open an issue for anything unclear.
