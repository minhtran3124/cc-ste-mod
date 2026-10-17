# cc-ste-mod

`ste-refine` is a Claude Code mod. It rewrites your prompt in ASD-STE100 Simplified Technical English before Claude reads it. You check the rewrite, then accept it, edit it or send your original prompt.

![The review pane showing the original prompt, the STE100 rewrite and the Accept, Edit and Deny buttons](docs/review-pane.png)

The rules come from the [asd-ste100 skill](https://github.com/danyuchn/asd-ste100-skill). They ask for short sentences, active voice, one instruction per sentence and no phrasal verbs. The mod keeps code, paths, identifiers, numbers and hedges as you wrote them.

## How it works

1. Type a prompt and press Enter.
2. The mod holds the prompt and asks a small model for a rewrite. The default model is `claude-haiku-5-5`. A status line under the prompt shows progress. To stop the wait and send the prompt as typed, run `/ste skip`.
3. The review pane opens only when there is a rewrite. It shows your original prompt and the rewrite, and it takes the keyboard.
   - Words that the rewrite adds are highlighted. The title shows the word count before and after.
   - The **Why** line names up to three STE rules that the rewrite applied.
   - If the rewrite drops a code span, URL, path, number or negation ("not", "never", "no", "don't"), a warning names it. **Edit** is then selected first, so Enter does not accept it by mistake. Otherwise, **Accept** is selected first.
   - **Tab** moves between **Accept**, **Edit** and **Deny**. From **Deny**, Tab returns to **Accept**.
   - **Enter** presses the selected button. `1`, `2` and `3` press a button directly.
   - **Esc** or the close mark closes the pane. The rewrite then waits in the band above the prompt, and a toast shows where it went.
   - While the pane is open, toasts wait behind it. They show after you choose.
4. Choose a button:
   - **Accept** sends the rewrite.
   - **Deny** sends your original prompt.
   - **Edit** opens the rewrite in a field. Press Enter to send what it contains, or choose **Back** to return.
5. After you deny three rewrites in a row, the review shows **Deny and pause for this session** (`p`). A toast also names `/ste pause`. Accept or Edit resets the count.

Each view shows its key hints under the buttons.

### When the pane cannot open

The rewrite then appears in the band above the prompt. Press `ctrl+x tab` or click the band to give it the keyboard. The mod then opens the pane, because Claude Code keeps the arrow keys in the band.

If the pane still cannot open, Tab and Enter work in the band. With an empty prompt box, `1`, `2` and `3` also work. Run `/ste review`, or choose **Open in pane** (`4`), to open the pane again.

## When the prompt goes as typed

The mod sends the prompt without a rewrite when:

- The prompt starts with `*`. The mod removes the `*`.
- The prompt is a slash command, or has fewer than 4 words.
- The prompt is simple. A simple prompt has 20 words or fewer, no phrasal verb ("kick off", "set up"), no passive verb ("is deleted") and no semicolon. Text in code spans, paths and URLs does not count, so `commit and push code` goes as typed.
- The prompt has an image or file attached.
- You type while a turn runs.
- The prompt is not English, or already follows STE100.
- The rewrite only adds or removes small words, such as "the", "then" or "and". It does not split a long sentence.
- The model call fails. A toast says why.

## Commands

```
/ste status                 show whether the rewrite is on, and the model
/ste review                 open the waiting rewrite in the pane
/ste skip                   stop a running rewrite and send the prompt as typed
/ste glossary on|off        follow CONTEXT.md in the project (off by default, kept across sessions)
/ste check <text>           show what the mod would do with the text, with no model call
/ste on                     enable the rewrite (kept across sessions)
/ste off                    disable the rewrite (kept across sessions)
/ste pause                  disable the rewrite for this session only
/ste accept                 same as the Accept button
/ste edit                   same as the Edit button
/ste deny                   same as the Deny button
```

## Settings

Open `/config` and set **Rewrite model**. Choose `claude-haiku-5-5`, `claude-sonnet-5-5` or `claude-opus-5-5`. Each is a pinned model version, so the rewrite does not change when a new model ships. `claude-haiku-5-5` is the fastest. Each rewrite waits for one model call, for up to 30 seconds.

**Project glossary.** Run `/ste glossary on` to make the rewrite follow `CONTEXT.md` in your project. The file lists project terms. It can also name words to avoid on `_Avoid_` lines. The rewrite uses each term as written, and it never uses a word that an `_Avoid_` line rejects. The mod sends the first 4000 characters of the file as data, not as instructions. The glossary is off by default, because a cloned repo can ship its own `CONTEXT.md`. Enable it only for projects you trust.

**Rewrite mode** is `strict` by default, and every STE rule applies. Set it to `pragmatic` to keep technical nouns and project terms as written. This mode also allows sentences of up to 25 words. `/ste status` shows the mode.

**Skill source** is `bundled` by default. Set it to `project` to read `.claude/skills/asd-ste100/SKILL.md` from your project. Use this setting only for projects you trust. A cloned repo can ship its own skill, and the rewrite follows it. See [Install](#install).

## Requirements and access

Tested with Claude Code 2.1.302. The mod uses function hooks, an early-access API that can change without notice.

The mod does this on your machine:

- It reads the skill file: the copy in `skill/`, or the project copy when **Skill source** is `project`.
- It reads `CONTEXT.md` in the project only after you run `/ste glossary on`.
- It sends each prompt that needs a rewrite to the rewrite model. Before it sends, it swaps fenced code blocks and pasted logs or stack traces for markers. The model never sees them, and the mod restores them unchanged.
- It stores your `/ste on` and `/ste off` choice in the mod store. It makes no other network call and writes no file.

## Install

In Claude Code, add this repository as a marketplace, then install the mod:

```
/plugin marketplace add minhtran3124/cc-ste-mod
/plugin install ste-refine@cc-ste-mod
```

Or clone the repository, then start Claude Code with the mod loaded:

```sh
git clone https://github.com/minhtran3124/cc-ste-mod.git
claude --plugin-dir ./cc-ste-mod
```

To load the mod in every session, add the folder's absolute path to `CLAUDE_CODE_PLUGIN_DIRS` in the `env` block of `~/.claude/settings.json`.

## Develop

Read [CONTRIBUTING.md](CONTRIBUTING.md) before you send a change. It covers setup, tests and the file layout. [CHANGELOG.md](CHANGELOG.md) lists the changes in each version.

## License

MIT. See [LICENSE](LICENSE). The files in `skill/` come from [danyuchn/asd-ste100-skill](https://github.com/danyuchn/asd-ste100-skill), MIT, Copyright (c) 2026 Dustin Yuchen Teng. See [skill/LICENSE](skill/LICENSE).
