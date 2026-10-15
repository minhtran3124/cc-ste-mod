# Contributing to cc-ste-mod

Thank you for your help with `ste-refine`. This guide tells you how to report a problem, set up the mod, and send a change.

<!-- TODO: Add a short note on what kinds of contributions you want (bug fixes, new hints, skill updates, docs). -->

## Report a problem

<!-- TODO: Say where to open issues and what to include. Suggested list: -->

- The Claude Code version (`claude --version`)
- The surface: terminal, desktop, VS Code or mobile
- The prompt you typed, and the rewrite you got
- What you expected to occur

## Set up

```sh
git clone https://github.com/minhtran3124/cc-ste-mod.git
cd cc-ste-mod
claude --plugin-dir .
```

<!-- TODO: Add any other setup steps (editor, TypeScript, hot reload). -->

## Make a change

| Path                        | What it holds                                                          |
| --------------------------- | ---------------------------------------------------------------------- |
| `hooks/register.tsx`        | The hooks: prompt rewrite, pane, band, `/ste` command                  |
| `types/index.d.ts`          | Types of the mod's session state                                       |
| `tests/ste-refine.test.tsx` | Tests                                                                  |
| `skill/`                    | Bundled copy of the asd-ste100 skill. Do not edit. Change it upstream. |

<!-- TODO: Add code style rules (naming, comments, one hook per event, etc.). -->

## Test

Run these commands before you send a change:

```sh
claude plugin validate .
claude plugin test .
npm run format:check
```

Add a test in `tests/` for each new behaviour.

<!-- TODO: Say how to test by hand in a real session (pane, band after ctrl+x tab, mobile). -->

## Send a pull request

<!-- TODO: Describe branch names, commit message format, and what a reviewer checks. -->

1. Create a branch from `main`.
2. Make the change and add tests.
3. Run validate and test.
4. Open a pull request. Say what changed and why.

## Write in STE100

<!-- TODO: Optional. Ask contributors to write docs and UI text in ASD-STE100 style, like the README. -->

## License

When you contribute, you agree that your contribution is under the [MIT License](LICENSE).
