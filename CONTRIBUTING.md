# Contributing to cc-ste-mod

Thank you for your help with `ste-refine`. This guide tells you how to report a problem, set up the mod, and send a change.

We welcome these changes:

- Bug fixes, with a test that fails before the fix.
- Changes to the checks that decide if a prompt gets a rewrite (`RISKS`, `isSimple`, `lostFrom`), with tests for the new cases.
- Better hints, toasts and review text.
- Documentation.

A change to the STE rules themselves belongs upstream, in [danyuchn/asd-ste100-skill](https://github.com/danyuchn/asd-ste100-skill).

## Report a problem

[Open an issue](https://github.com/minhtran3124/cc-ste-mod/issues). Include:

- The Claude Code version (`claude --version`)
- The surface: terminal, desktop, VS Code or mobile
- The prompt you typed, and the rewrite you got
- What you expected to occur
- The output of `/ste status`
- The output of `/ste check <your prompt>`, which shows if the mod chose to rewrite it

Do not paste secrets. Remove them from the prompt first.

## Set up

```sh
git clone https://github.com/minhtran3124/cc-ste-mod.git
cd cc-ste-mod
npm install                # once, for Prettier
claude --plugin-dir .
```

There is no build step. Claude Code reads `hooks/register.tsx` when it loads the mod, so restart Claude Code after you change it. Claude Code writes `.claude-plugin/types/` for your build. Git ignores that folder.

## Make a change

| Path                      | What it holds                                                          |
| ------------------------- | ---------------------------------------------------------------------- |
| `hooks/register.tsx`      | The hooks: prompt rewrite, pane, band, `/ste` command                  |
| `types/index.d.ts`        | Types of the mod's session state                                       |
| `tests/register.test.tsx` | Tests                                                                  |
| `skill/`                  | Bundled copy of the asd-ste100 skill. Do not edit. Change it upstream. |
| `.claude-plugin/`         | The manifest, the settings, and the marketplace entry                  |

Follow these rules:

- Prettier sets the format. Run `npm run format` and do not argue with it.
- Never lose the person's prompt. Each failure path in `prompt.submit` must end in `next(e)`, so the prompt goes as typed.
- Register one hook for each event and filter. Give each gating hook a `.catch`.
- Name a Boolean with `is` or `has`, as in `isEditing`.
- Write a comment to say why, not what. Keep it short.
- Keep the key hints and the README in step with the code.

## Test

Run these commands before you send a change:

```sh
claude plugin validate .
claude plugin test .
npm run format:check
```

Add a test in `tests/register.test.tsx` for each new behaviour. The tests put a stub model under the mod, so they do not call a real model.

The tests cannot show how the review looks and feels. Test by hand in a real session as well:

1. Start Claude Code with `claude --plugin-dir .`.
2. Type `Please kick off the build and then check the logs`. A pane must open with the rewrite.
3. Press Tab, Enter, `1`, `2` and `3`. Each must do what the hint line says.
4. Press Esc. The rewrite must move to the band above the prompt. Press `ctrl+x tab`, and the pane must open again.
5. Run `/ste review`, `/ste skip` and `/ste check <text>`.
6. On mobile, check that the review shows Accept and Deny, and no Edit.

## Send a pull request

1. Create a branch from `main`.
2. Make the change and add tests.
3. Run validate, test and format:check.
4. Open a pull request. Say what changed and why.

Write the commit subject in the imperative, as in "Add a rewrite mode setting". Use the body to say why. A reviewer checks that:

- the change has a test, and all checks pass
- the prompt can never be lost
- the README and the hints match the new behaviour

## Write in STE100

Please write documentation and review text in ASD-STE100 style, as the README does: short sentences, active voice, one instruction per sentence. Use `/ste check` on a draft to find the common problems. This is a request, not a rule.

## License

When you contribute, you agree that your contribution is under the [MIT License](LICENSE).
