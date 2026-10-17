# Changelog

This file follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.2.0] - 2026-10-17

### Added

- A warning in the review when a rewrite loses a code span, URL, path, number or negation. The focus then starts on Edit.
- Pasted code blocks, stack traces and logs are hidden from the rewrite model and put back after.
- `/ste check <text>`: says what the mod would do with the text, with no model call.
- The **Rewrite mode** setting: `strict` (default) or `pragmatic`.
- The **Skill source** setting: `bundled` (default) or `project`.
- A "Requirements and access" section in the README.
- `author`, `repository` and `license` in `plugin.json`.

### Changed

- The mod reads the project skill (`.claude/skills/asd-ste100/SKILL.md`) only when **Skill source** is `project`. Before, it always preferred that file.
- The phrasal-verb check also catches `on` and `in` (for example "turn on", "log in"), and more verbs such as log, sign, run and pull.
- The tests are in `tests/register.test.tsx`, in one `describe('register')`.

### Fixed

- The passive-voice check no longer flags adjectives and adverbs that end in -ed or -en, such as "is open", "is often" and "is green".
- The added-word marks in the review have a `key`.
- The three gating hooks that had no `.catch` now have one.

## [0.1.0]

### Added

- The `ste-refine` mod: it rewrites each typed prompt in ASD-STE100 Simplified Technical English, and you accept, edit or deny the rewrite before it is sent.
- The review pane and the band above the prompt, with word marks, a Why line and key hints.
- The `/ste` commands: `status`, `review`, `skip`, `on`, `off`, `pause`, `accept`, `edit` and `deny`.
- The **Rewrite model** setting.
- Tests, and the marketplace entry for installing from this repository.

[Unreleased]: https://github.com/minhtran3124/cc-ste-mod/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/minhtran3124/cc-ste-mod/compare/069e747...v0.2.0
[0.1.0]: https://github.com/minhtran3124/cc-ste-mod/commit/069e747
