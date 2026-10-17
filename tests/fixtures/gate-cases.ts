// Prompts with the outcome the mod must give: `typed` goes as typed, `rewrite` gets a model call.
// Add a line here for each real prompt that the gate got wrong. `note` says why the case exists.
export const GATE_CASES: { text: string; goes: 'typed' | 'rewrite'; note?: string }[] = [
  // Goes as typed: short, or simple.
  { text: 'fix it', goes: 'typed', note: 'fewer than 4 words' },
  { text: 'commit and push code', goes: 'typed' },
  { text: 'Add a unit test for the parser and run the suite', goes: 'typed' },
  { text: 'What does the retry loop in client.ts do', goes: 'typed' },
  { text: 'Show me the diff of the last commit', goes: 'typed' },
  { text: 'Please fix the failing test in src/app.ts and run the suite again', goes: 'typed' },
  { text: 'Rename `getUser` to `fetchUser` in every file under src/api', goes: 'typed' },
  {
    text: 'Run `npm run set up` and open docs/set-up/guide.md',
    goes: 'typed',
    note: 'a phrasal verb in code or a path',
  },
  { text: 'The port is open on my laptop, check it.', goes: 'typed', note: 'adjective that ends in -en' },
  { text: 'The cache is often stale after a deploy, so clear it.', goes: 'typed', note: 'adverb that ends in -en' },
  { text: 'The build is green, so merge the branch now.', goes: 'typed', note: 'adjective that ends in -en' },
  { text: '* kick off the build and read the logs', goes: 'typed', note: 'a leading * sends it as typed' },
  {
    text: 'Why does this fail\n```\nTypeError: x is undefined\n```',
    goes: 'typed',
    note: 'simple without its pasted block',
  },
  // Gets a rewrite: a pattern that STE fixes, or a long prompt.
  { text: 'kick off the build', goes: 'rewrite', note: 'phrasal verb' },
  { text: 'set up the CI job for this repo', goes: 'rewrite', note: 'phrasal verb' },
  { text: 'Turn on the feature flag before you deploy.', goes: 'rewrite', note: 'phrasal verb with on' },
  { text: 'Log in to the staging server first.', goes: 'rewrite', note: 'phrasal verb with in' },
  { text: 'Sign in with the test account now.', goes: 'rewrite', note: 'phrasal verb with in' },
  { text: 'Please figure out why the test is failing and wrap up the fix', goes: 'rewrite', note: 'two phrasal verbs' },
  { text: 'The config file is deleted when the job ends', goes: 'rewrite', note: 'passive verb' },
  { text: 'The users table is migrated by the script every night', goes: 'rewrite', note: 'passive verb' },
  { text: 'Run the tests; fix what fails', goes: 'rewrite', note: 'semicolon' },
  {
    text: 'Read the README and then update the install section so that it matches the commands in package.json and also add a short note about the new flag and then run the tests to make sure nothing broke',
    goes: 'rewrite',
    note: 'more than 20 words',
  },
  // Known gaps: the mod does not catch these yet. A line here records what it does today.
  // When a gap is fixed, move its line up and set `goes` to `rewrite`.
  { text: 'The release is made by the team on Friday.', goes: 'typed', note: 'known gap: an irregular participle' },
]
