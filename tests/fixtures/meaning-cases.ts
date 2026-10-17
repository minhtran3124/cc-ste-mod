// A prompt, a rewrite of it, and what the rewrite lost. `lost` is the list the mod must name, in order.
// Each prompt holds a phrasal verb, so it reaches the model, and each rewrite fixes it, so it is shown.
export const MEANING_CASES: { name: string; original: string; rewrite: string; lost: string[] }[] = [
  {
    name: 'keeps code, a path and a number',
    original: 'Do not kick off the build with `npm ci` in src/api before 3 workers are ready',
    rewrite: 'Do not start the build with `npm ci` in src/api before 3 workers are ready.',
    lost: [],
  },
  {
    name: 'drops a negation',
    original: 'Do not kick off the build before the backup ends',
    rewrite: 'Start the build before the backup ends.',
    lost: ['negation'],
  },
  {
    name: 'writes "don\'t" as "do not"',
    original: "Don't kick off the build before the backup ends",
    rewrite: 'Do not start the build before the backup ends.',
    lost: [],
  },
  {
    name: 'writes "never" as "do not"',
    original: 'Never kick off the build on main',
    rewrite: 'Do not start the build on main.',
    lost: [],
  },
  {
    name: 'drops "without"',
    original: 'Kick off the build without the cache',
    rewrite: 'Start the build with the cache.',
    lost: ['negation'],
  },
  {
    name: 'writes a number as a word',
    original: 'Kick off the build and retry 3 times',
    rewrite: 'Start the build. Retry three times.',
    lost: ['3'],
  },
  {
    name: 'changes a decimal',
    original: 'Kick off the build and wait 2.5 seconds',
    rewrite: 'Start the build. Wait 2 seconds.',
    lost: ['2.5'],
  },
  {
    name: 'drops the backticks of a code span',
    original: 'Kick off the build with `npm ci` and check the logs',
    rewrite: 'Start the build with npm ci. Read the logs.',
    lost: ['`npm ci`'],
  },
  {
    name: 'replaces a path',
    original: 'Kick off the build and edit src/api/user.ts',
    rewrite: 'Start the build. Edit the user file.',
    lost: ['src/api/user.ts'],
  },
  {
    name: 'replaces a URL',
    original: 'Kick off the build and read https://example.com/docs/ci',
    rewrite: 'Start the build. Read the CI page.',
    lost: ['https://example.com/docs/ci'],
  },
  {
    name: 'changes "and/or", which is not a path',
    original: 'Kick off the build with a flag and/or an env var',
    rewrite: 'Start the build with a flag or an env var.',
    lost: [],
  },
  {
    name: 'puts a pasted block back',
    original: 'Kick off the build and read this\n```\nboom\n```',
    rewrite: 'Start the build. Read this.\n{{KEEP_1}}',
    lost: [],
  },
  {
    name: 'loses a code span, a number and a negation',
    original: 'Do not kick off the build with `npm ci` for 3 workers',
    rewrite: 'Start the build for workers.',
    lost: ['`npm ci`', '3', 'negation'],
  },
]
