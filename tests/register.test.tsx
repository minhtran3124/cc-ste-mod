import type { EngineInterface, On, ResolveInput } from 'claude-code'
import { describe, expect, mock, test } from 'claude-code/testing'

const TYPED = 'It is important to note that you should kick off the build and then check the logs'
const REWRITE = 'Start the build. Then read the logs.'
const SCROLL = { offset: 0, bodyRows: 19 }
const BAND = {
  plugin: 'ste-refine',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 100, scroll: SCROLL, view: {} },
} as const
const PANE = {
  plugin: 'ste-refine',
  component: 'Pane',
  requestId: 'ste-review',
  props: { title: 'STE100 rewrite', isFocused: true, bodyColumns: 100, placement: 'inline', scroll: SCROLL, view: {} },
} as const
const USAGE = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
const answered = { isAnswered: true, text: `<rewrite>${REWRITE}</rewrite>`, usage: USAGE } as const

// A /ste command typed at the prompt.
const ste = (args: string) => ({
  command: 'ste',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: false, columns: 100 },
})

const typed = (text: string) => ({ text, wait: false, origin: { kind: 'composer' } as const })

// Stands for the engine beneath the plugin: the model, the prompt, panes, and its own empty band.
function engine(
  on: On,
  {
    isPlaced = true,
    reply = answered as unknown,
    box = '',
    hold = undefined as Promise<void> | undefined,
    closeFails = false,
    skillMissing = false,
  } = {},
) {
  const sent: string[] = []
  const opened: string[] = []
  const panes = new Set<string>()
  const focused: (string | undefined)[] = []
  const clock = mock.clock(on)
  const promptBox = { text: box }
  on('prompt.read', () => ({ value: { text: promptBox.text, cursor: promptBox.text.length } }))
  on('prompt.fill', (_$, e) => {
    promptBox.text = e.text
    return { isFilled: true }
  })
  const model = { calls: 0, systems: [] as string[], prompts: [] as string[] }
  if (skillMissing)
    on('fs.read', () => {
      throw new Error('ENOENT')
    })
  on('model.complete', async (_$, e) => {
    model.calls += 1
    model.systems.push(JSON.stringify(e.system))
    model.prompts.push(JSON.stringify(e.prompt))
    await hold
    return { value: reply as typeof answered }
  })
  const stored = new Map<string, unknown>()
  on('store.get', (_$, e) => ({ value: stored.get(e.key) }))
  on('store.set', (_$, e) => {
    stored.set(e.key, e.value)
    return { value: undefined }
  })
  on('prompt.submit', (_$, e) => {
    sent.push(e.text)
    return { text: e.text }
  })
  on('ui.open', (_$, e) => {
    opened.push(e.id)
    if (isPlaced) panes.add(e.id)
    // The dialog options are what make the arrow keys walk the buttons.
    expect(e.focus && e.closeOnEscape && e.holdToasts).toBe(true)
    return { value: isPlaced ? { isPlaced: true } : { isPlaced: false, reason: 'too narrow' } }
  })
  on('ui.close', (_$, e) => {
    if (closeFails) throw new Error('no panes on this surface')
    panes.delete(e.id)
    return { value: undefined }
  })
  on('ui.focus', (_$, e) => {
    focused.push(e.element)
    return {}
  })
  on('ui.panes', () => ({
    value: [...panes].map(id => ({ id, title: id, isShown: true, isFocused: true, isPlaced: true })),
  }))
  on('ui.render', ($: EngineInterface, e: ResolveInput) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  return { sent, opened, model, promptBox, clock, panes, focused }
}

describe('register', () => {
  test('opens the rewrite in a focused pane, and Accept sends it', async ($, on) => {
    const { sent, opened } = engine(on)

    const held = await $.prompt.submit(typed(TYPED))
    expect(held.drop).toBeDefined()
    expect(sent).toEqual([])
    expect(opened).toEqual(['ste-review'])

    for (const surface of ['terminal', 'desktop'] as const) {
      const band = await $.ui.mount({ ...BAND, surface })
      expect(await band.find({ type: 'Text', text: REWRITE })).toBeUndefined()
      await band.unmount()

      const pane = await $.ui.mount({ ...PANE, surface })
      expect(await pane.find({ type: 'Text', text: REWRITE })).toBeDefined()
      await pane.unmount()
    }

    const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
    await pane.press({ key: 'accept' })
    expect(sent).toEqual([REWRITE])
    await pane.unmount()
  })

  test('clears the prompt box after a choice while it still holds the typed prompt', async ($, on) => {
    const { promptBox } = engine(on, { box: TYPED })

    await $.prompt.submit(typed(TYPED))
    const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
    await pane.press({ key: 'accept' })
    expect(promptBox.text).toBe('')
    await pane.unmount()
  })

  test('keeps new text the person typed in the prompt box', async ($, on) => {
    const { promptBox } = engine(on, { box: 'something new' })

    await $.prompt.submit(typed(TYPED))
    const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
    await pane.press({ key: 'deny' })
    expect(promptBox.text).toBe('something new')
    await pane.unmount()
  })

  test('focuses the pane again once the hold settles, over a cleared prompt box', async ($, on) => {
    const { opened, promptBox, clock } = engine(on)

    await $.prompt.submit(typed(TYPED))
    expect(opened).toEqual(['ste-review'])
    // The engine puts the held prompt back after the drop; the mod clears it and asks again.
    promptBox.text = TYPED
    await clock.advance(200)
    expect(promptBox.text).toBe('')
    expect(opened).toEqual(['ste-review', 'ste-review'])
  })

  test('shows no box when the model decides no rewrite is needed', async ($, on) => {
    const { sent, opened } = engine(on, { reply: { ...answered, text: `<rewrite>${TYPED}</rewrite>` } })

    await $.prompt.submit(typed(TYPED))
    expect(sent).toEqual([TYPED])
    expect(opened).toEqual([])
    for (const surface of ['terminal', 'desktop'] as const) {
      const band = await $.ui.mount({ ...BAND, surface })
      expect(await band.find({ type: 'Button' })).toBeUndefined()
      expect(await band.find({ type: 'Text', text: /STE100/ })).toBeUndefined()
      await band.unmount()
    }
  })

  test('falls back to the band when the pane cannot be placed', async ($, on) => {
    const { sent } = engine(on, { isPlaced: false })

    await $.prompt.submit(typed(TYPED))
    const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
    expect(await band.find({ type: 'Text', text: REWRITE })).toBeDefined()
    await band.press({ key: 'deny' })
    expect(sent).toEqual([TYPED])
    await band.unmount()
  })

  test('Edit opens a field and sends what the person typed', async ($, on) => {
    const { sent } = engine(on)

    await $.prompt.submit(typed(TYPED))
    for (const surface of ['terminal', 'desktop'] as const) {
      const pane = await $.ui.mount({ ...PANE, surface })
      await pane.press({ key: 'edit' })
      expect(await pane.find({ type: 'Input', key: 'edited', text: REWRITE })).toBeDefined()
      await pane.press({ key: 'back' })
      expect(await pane.find({ type: 'Input' })).toBeUndefined()
      await pane.unmount()
    }

    const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
    await pane.press({ key: 'edit' })
    await pane.input({ key: 'edited', text: 'Start the build. Then read the last 50 log lines.' })
    expect(sent).toEqual(['Start the build. Then read the last 50 log lines.'])
    await pane.unmount()
  })

  test('hides a <kept>none</kept> note', async ($, on) => {
    engine(on, { reply: { ...answered, text: `<rewrite>${REWRITE}</rewrite>\n<kept>none</kept>` } })

    await $.prompt.submit(typed(TYPED))
    const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
    expect(await pane.find({ type: 'Text', text: REWRITE })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /Kept as-is/ })).toBeUndefined()
    await pane.unmount()
  })

  test('sends the prompt as typed when the model call fails', async ($, on) => {
    const { sent, opened } = engine(on, { reply: { isAnswered: false, reason: 'empty-reply', usage: USAGE } })

    const result = await $.prompt.submit(typed(TYPED))
    expect(result.drop).toBeUndefined()
    expect(sent).toEqual([TYPED])
    expect(opened).toEqual([])
  })

  test('leaves short prompts and slash commands alone', async ($, on) => {
    const { opened, model } = engine(on)

    await $.prompt.submit(typed('yes do it'))
    await $.prompt.submit({ ...typed('/ste status'), command: { name: 'ste', args: 'status' } })
    expect(model.calls).toBe(0)
    expect(opened).toEqual([])
  })

  test('shows key hints that fit where the rewrite is drawn', async ($, on) => {
    engine(on)
    await $.prompt.submit(typed(TYPED))
    const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
    expect(await pane.find({ type: 'Text', text: /Tab to move · Enter to choose/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /ctrl\+x tab/ })).toBeUndefined()
    await pane.press({ key: 'edit' })
    expect(await pane.find({ type: 'Text', text: /Enter to send/ })).toBeDefined()
    await pane.unmount()
  })

  test('the band says ctrl+x tab gives it the keys', async ($, on) => {
    engine(on, { isPlaced: false })
    const held = await $.prompt.submit(typed(TYPED))
    expect(held.drop).toMatch(/ctrl\+x tab/)
    const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
    expect(await band.find({ type: 'Text', text: /Click here or press ctrl\+x tab/ })).toBeDefined()
    await band.unmount()
    const phone = await $.ui.mount({ ...BAND, surface: 'mobile' })
    expect(await phone.find({ type: 'Text', text: /ctrl\+x tab/ })).toBeUndefined()
    await phone.unmount()
  })

  test('a pane the engine dropped leaves the rewrite in the band, and Open in pane brings it back', async ($, on) => {
    const { opened, sent, panes } = engine(on)

    await $.prompt.submit(typed(TYPED))
    expect(opened).toEqual(['ste-review'])
    // An unload drops the pane with no ui.close hook.
    panes.clear()

    const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
    expect(await band.find({ type: 'Text', text: REWRITE })).toBeDefined()
    await band.press({ key: 'open' })
    expect(opened).toEqual(['ste-review', 'ste-review'])
    await band.unmount()

    const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
    await pane.press({ key: 'accept' })
    expect(sent).toEqual([REWRITE])
    await pane.unmount()
  })

  test('/ste review reopens a dropped pane', async ($, on) => {
    const { opened, panes } = engine(on)

    await $.prompt.submit(typed(TYPED))
    panes.clear()
    const result = await $.command.run({
      command: 'ste',
      args: 'review',
      origin: { kind: 'composer' },
      presentation: { isFullscreen: false, columns: 120 },
    })
    expect(result.text).toMatch(/Opened/)
    expect(opened).toEqual(['ste-review', 'ste-review'])
  })

  // The wrap itself is the mod's own `$.ui.focus`, which the test kit does not carry to the
  // engine below; this test holds what the kit can see: no move ever reaches the close mark.
  test('Tab past either end never lands on the close mark', async ($, on) => {
    const { focused, clock } = engine(on)

    await $.prompt.submit(typed(TYPED))
    const pane = { component: 'Pane', requestId: 'ste-review', origin: { kind: 'person' } } as const
    for (const element of ['deny', 'accept', 'edit']) {
      await $.ui.focus({ ...pane, plugin: 'ste-refine', element })
      expect((await $.ui.focus(pane)).deny).toBeDefined()
      await clock.advance(10)
    }
    expect(focused).toEqual(['deny', 'accept', 'edit'])
  })

  test('giving the band the keys opens the pane, where the arrows walk the buttons', async ($, on) => {
    const { opened, panes, clock } = engine(on)

    await $.prompt.submit(typed(TYPED))
    panes.clear()
    const band = { component: 'AbovePrompt', requestId: 'band' } as const
    await $.ui.focus({ ...band, plugin: 'ste-refine', element: 'accept', origin: { kind: 'person' } })
    await clock.advance(400)
    // The pane opens, then opens again once the hold settles to take the keys.
    const count = opened.length
    expect(count).toBeGreaterThan(1)

    // Tab inside the band does not try again.
    panes.clear()
    await $.ui.focus({ ...band, plugin: 'ste-refine', element: 'deny', origin: { kind: 'person' } })
    await clock.advance(400)
    expect(opened.length).toBe(count)
  })

  test('marks the words the rewrite added', async ($, on) => {
    engine(on)
    await $.prompt.submit(typed(TYPED))
    const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
    // "the build" and "logs" are in the typed prompt; "Start" and "read" are new.
    const shown = await pane.find({ type: 'Text', text: REWRITE })
    const marked = (shown?.children ?? []).flatMap(child =>
      typeof child === 'object' && child !== null && 'children' in child ? [child.children] : [],
    )
    expect(marked).toEqual([['Start'], ['read']])
    expect(await pane.find({ type: 'Text', text: /17 → 7 words/ })).toBeDefined()
    await pane.unmount()
  })

  test('a prompt that starts with * goes as typed, without the *', async ($, on) => {
    const { sent, model } = engine(on)
    await $.prompt.submit(typed(`* ${TYPED}`))
    expect(model.calls).toBe(0)
    expect(sent).toEqual([TYPED])
  })

  test('/ste skip cuts a running rewrite and sends the prompt as typed', async ($, on) => {
    let release = () => {}
    const { sent, opened, model, clock } = engine(on, { hold: new Promise<void>(resolve => (release = resolve)) })
    const held = $.prompt.submit(typed(TYPED))
    for (let tick = 0; tick < 50 && model.calls === 0; tick++) await clock.advance(1)
    expect(model.calls).toBe(1)
    const skipped = await $.command.run(ste('skip'))
    expect(skipped.text).toMatch(/Skipped/)
    release()
    await held
    expect(sent).toEqual([TYPED])
    expect(opened).toEqual([])
  })

  test('/ste pause turns the rewrite off for this session only', async ($, on) => {
    const { model } = engine(on)
    await $.command.run(ste('pause'))
    await $.prompt.submit(typed(TYPED))
    expect(model.calls).toBe(0)
    expect((await $.command.run(ste('status'))).text).toMatch(/paused for this session/)
    await $.command.run(ste('on'))
    expect((await $.command.run(ste('status'))).text).toMatch(/ is on /)
  })

  test('shows why the rewrite changed the prompt', async ($, on) => {
    engine(on, {
      reply: {
        ...answered,
        text: `<rewrite>${REWRITE}</rewrite>\n<why>phrasal verb to one verb</why>\n<why>one instruction per sentence</why>`,
      },
    })
    await $.prompt.submit(typed(TYPED))
    for (const surface of ['terminal', 'desktop'] as const) {
      const pane = await $.ui.mount({ ...PANE, surface })
      expect(
        await pane.find({ type: 'Text', text: 'Why: phrasal verb to one verb · one instruction per sentence' }),
      ).toBeDefined()
      await pane.unmount()
    }
  })

  test('warns when the rewrite drops a negation or a number, and starts on Edit', async ($, on) => {
    const typedText = 'Do not kick off the build and then check the logs, because the staging run uses 3 workers'
    engine(on, {
      reply: {
        ...answered,
        text: '<rewrite>Start the build. Then read the logs. The staging run uses workers.</rewrite>',
      },
    })
    await $.prompt.submit(typed(typedText))
    const first = await $.ui.mount({ ...PANE, surface: 'terminal' })
    expect((await first.find({ type: 'Button', key: 'edit' }))?.props.autoFocus).toBe(true)
    expect((await first.find({ type: 'Button', key: 'accept' }))?.props.autoFocus).toBeUndefined()
    await first.unmount()
    for (const surface of ['terminal', 'desktop'] as const) {
      const pane = await $.ui.mount({ ...PANE, surface })
      expect(
        await pane.find({ type: 'Text', text: 'The rewrite lost 3, negation. Check it before you accept.' }),
      ).toBeDefined()
      await pane.unmount()
    }
  })

  test('warns when the rewrite drops a code span', async ($, on) => {
    const typedText = 'Rename `getUser` to `fetchUser` in src/api and then kick off the build'
    engine(on, {
      reply: { ...answered, text: '<rewrite>Rename getUser to fetchUser in src/api. Start the build.</rewrite>' },
    })
    await $.prompt.submit(typed(typedText))
    const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
    expect(
      await pane.find({ type: 'Text', text: 'The rewrite lost `getUser`, `fetchUser`. Check it before you accept.' }),
    ).toBeDefined()
    await pane.unmount()
  })

  test('a rewrite that keeps everything shows no warning and starts on Accept', async ($, on) => {
    const typedText = 'Do not kick off the build with `npm ci` in src/api and then check the 3 logs'
    engine(on, {
      reply: {
        ...answered,
        text: '<rewrite>Do not start the build with `npm ci` in src/api. Then read the 3 logs.</rewrite>',
      },
    })
    await $.prompt.submit(typed(typedText))
    const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
    expect((await pane.find({ type: 'Button', key: 'accept' }))?.props.autoFocus).toBe(true)
    expect((await pane.find({ type: 'Button', key: 'edit' }))?.props.autoFocus).toBeUndefined()
    expect(await pane.find({ type: 'Text', text: /rewrite lost/ })).toBeUndefined()
    await pane.unmount()
  })

  test('after 3 Denies in a row, the review offers to pause for the session', async ($, on) => {
    const { sent, model } = engine(on)
    for (let round = 0; round < 3; round++) {
      await $.prompt.submit(typed(TYPED))
      const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
      expect(await pane.find({ type: 'Button', key: 'pause' })).toBeUndefined()
      await pane.press({ key: 'deny' })
      await pane.unmount()
    }
    await $.prompt.submit(typed(TYPED))
    const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
    await pane.press({ key: 'pause' })
    await pane.unmount()
    expect(sent).toEqual([TYPED, TYPED, TYPED, TYPED])
    await $.prompt.submit(typed(TYPED))
    expect(model.calls).toBe(4)
  })

  test('an Accept starts the Deny count again', async ($, on) => {
    engine(on)
    for (const choice of ['deny', 'deny', 'accept', 'deny']) {
      await $.prompt.submit(typed(TYPED))
      const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
      await pane.press({ key: choice })
      await pane.unmount()
    }
    await $.prompt.submit(typed(TYPED))
    const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
    expect(await pane.find({ type: 'Button', key: 'pause' })).toBeUndefined()
    await pane.unmount()
  })

  test('a pane that cannot close still sends the choice', async ($, on) => {
    const { sent } = engine(on, { closeFails: true })
    await $.prompt.submit(typed(TYPED))
    const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
    await pane.press({ key: 'accept' })
    expect(sent).toEqual([REWRITE])
    await pane.unmount()
  })

  test('a new prompt drops the rewrite that was waiting', async ($, on) => {
    const { sent } = engine(on, { isPlaced: false })
    await $.prompt.submit(typed(TYPED))
    await $.prompt.submit(typed('yes do it'))
    expect(sent).toEqual(['yes do it'])
    const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
    expect(await band.find({ type: 'Text', text: REWRITE })).toBeUndefined()
    await band.unmount()
    expect((await $.command.run(ste('accept'))).text).toBe('No STE rewrite is waiting.')
    expect(sent).toEqual(['yes do it'])
  })

  test('/ste accept does not drop the rewrite it answers', async ($, on) => {
    const { sent, clock } = engine(on, { isPlaced: false })
    await $.prompt.submit(typed(TYPED))
    await $.prompt.submit({ ...typed('/ste accept'), command: { name: 'ste', args: 'accept' } })
    expect((await $.command.run(ste('accept'))).text).toBe('Sending the STE rewrite.')
    await clock.advance(1)
    expect(sent).toContain(REWRITE)
  })

  test('Edit pressed with the click that focuses the band stays in Edit', async ($, on) => {
    const { panes, clock } = engine(on)
    await $.prompt.submit(typed(TYPED))
    panes.clear()
    const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
    await $.ui.focus({
      component: 'AbovePrompt',
      requestId: 'band',
      plugin: 'ste-refine',
      element: 'edit',
      origin: { kind: 'person' },
    })
    await band.press({ key: 'edit' })
    await clock.advance(400)
    expect(await band.find({ type: 'Input', key: 'edited' })).toBeDefined()
    await band.unmount()
  })

  test('a choice made before the band opens the pane is not undone', async ($, on) => {
    const { sent, panes, clock } = engine(on)
    await $.prompt.submit(typed(TYPED))
    panes.clear()
    const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
    await $.ui.focus({
      component: 'AbovePrompt',
      requestId: 'band',
      plugin: 'ste-refine',
      element: 'accept',
      origin: { kind: 'person' },
    })
    await band.press({ key: 'accept' })
    await clock.advance(400)
    await band.unmount()
    expect(sent).toEqual([REWRITE])
    expect((await $.command.run(ste('accept'))).text).toBe('No STE rewrite is waiting.')
  })

  test('a * prompt stays as typed while the mod is off', async ($, on) => {
    const { sent } = engine(on)
    await $.command.run(ste('off'))
    await $.prompt.submit(typed('* fix the login bug\n* add tests'))
    expect(sent).toEqual(['* fix the login bug\n* add tests'])
  })

  test('/ste skip works while the skill file is still being read', async ($, on) => {
    let release = () => {}
    const reading = new Promise<void>(resolve => (release = resolve))
    const { sent, model, clock } = engine(on)
    let isReading = false
    on('fs.read', async (_$, e, next) => {
      isReading = true
      await reading
      return next(e)
    })
    const held = $.prompt.submit(typed(TYPED))
    for (let tick = 0; tick < 50 && !isReading; tick++) await clock.advance(1)
    expect(isReading).toBe(true)
    const skipped = await $.command.run(ste('skip'))
    expect(skipped.text).toMatch(/Skipped/)
    release()
    await held
    expect(model.calls).toBe(0)
    expect(sent).toEqual([TYPED])
  })

  test('a skill file that cannot be read is tried again on the next prompt', async ($, on) => {
    const { model } = engine(on, { skillMissing: true })
    await $.prompt.submit(typed(TYPED))
    await $.prompt.submit(typed(TYPED))
    expect(model.calls).toBe(2)
  })

  test('a simple prompt goes as typed, with no model call', async ($, on) => {
    const { sent, model, opened } = engine(on)
    const simple = [
      'commit and push code',
      'Please fix the failing test in src/app.ts and run the suite again',
      'Rename `getUser` to `fetchUser` in every file under src/api',
    ]
    for (const text of simple) await $.prompt.submit(typed(text))
    expect(model.calls).toBe(0)
    expect(opened).toEqual([])
    expect(sent).toEqual(simple)
  })

  test('a short prompt with a pattern STE fixes still gets a rewrite', async ($, on) => {
    const { model } = engine(on)
    const risky = [
      'kick off the build',
      'set up the CI job for this repo',
      'The config file is deleted when the job ends',
      'Run the tests; fix what fails',
    ]
    for (const text of risky) {
      await $.prompt.submit(typed(text))
      await $.command.run(ste('deny'))
    }
    expect(model.calls).toBe(risky.length)
  })

  test('a phrasal verb inside code or a path does not count', async ($, on) => {
    const { model } = engine(on)
    await $.prompt.submit(typed('Run `npm run set up` and open docs/set-up/guide.md'))
    expect(model.calls).toBe(0)
  })

  test('an adjective that ends in -ed or -en is not a passive verb', async ($, on) => {
    const { sent, model } = engine(on)
    const adjectives = [
      'The port is open on my laptop, check it.',
      'The cache is often stale after a deploy, so clear it.',
      'The build is green, so merge the branch now.',
    ]
    for (const text of adjectives) await $.prompt.submit(typed(text))
    expect(model.calls).toBe(0)
    expect(sent).toEqual(adjectives)
  })

  test('a phrasal verb with on or in, or a verb such as log or sign, counts', async ($, on) => {
    const { model } = engine(on)
    const phrasal = [
      'Turn on the feature flag before you deploy.',
      'Log in to the staging server first.',
      'Sign in with the test account now.',
    ]
    for (const text of phrasal) {
      await $.prompt.submit(typed(text))
      await $.command.run(ste('deny'))
    }
    expect(model.calls).toBe(phrasal.length)
  })

  test('the bundled skill is read unless the project skill is chosen', async ($, on) => {
    engine(on)
    const reads: string[] = []
    on('fs.read', (_$, e) => {
      reads.push(JSON.stringify(e))
      throw new Error('ENOENT')
    })
    await $.prompt.submit(typed(TYPED))
    expect(reads.some(read => read.includes('skill/SKILL.md'))).toBe(true)
    expect(reads.some(read => read.includes('.claude/skills'))).toBe(false)
  })

  test('a pasted block is hidden from the model and put back in the rewrite', async ($, on) => {
    const block = '```\nTypeError: x is undefined\n  at foo (a.js:1:1)\n```'
    const { sent, model } = engine(on, {
      reply: { ...answered, text: '<rewrite>Start the build. Then read this error.\n{{KEEP_1}}</rewrite>' },
    })
    await $.prompt.submit(typed(`Please kick off the build and then check this error\n${block}`))
    expect(model.prompts[0]).toContain('{{KEEP_1}}')
    expect(model.prompts[0]).not.toContain('TypeError')
    const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
    await pane.press({ key: 'accept' })
    expect(sent).toEqual([`Start the build. Then read this error.\n${block}`])
    await pane.unmount()
  })

  test('a stack trace with no fence is hidden from the model too', async ($, on) => {
    const trace = '  at foo (a.js:1:1)\n  at bar (b.js:2:2)'
    const { model } = engine(on)
    await $.prompt.submit(typed(`Please kick off the build and then check this error\n${trace}`))
    expect(model.prompts[0]).toContain('{{KEEP_1}}')
    expect(model.prompts[0]).not.toContain('a.js')
  })

  test('a rewrite that loses a pasted block is not shown', async ($, on) => {
    const text = 'Please kick off the build and then check this error\n```\nboom\n```'
    const { sent, opened } = engine(on)
    await $.prompt.submit(typed(text))
    expect(opened).toEqual([])
    expect(sent).toEqual([text])
  })

  test('a prompt that is simple without its pasted block goes as typed', async ($, on) => {
    const text = 'Why does this fail\n```\nTypeError: x is undefined\n```'
    const { sent, model } = engine(on)
    await $.prompt.submit(typed(text))
    expect(model.calls).toBe(0)
    expect(sent).toEqual([text])
  })

  test('/ste check says what would happen, with no model call', async ($, on) => {
    const { model } = engine(on)
    const risky = await $.command.run(ste('check Please kick off the build and then read the logs'))
    expect(risky.text).toMatch(/It gets a rewrite/)
    expect(risky.text).toMatch(/phrasal verb "kick off"/)
    const simple = await $.command.run(ste('check commit and push code'))
    expect(simple.text).toMatch(/It goes as typed, because it is simple/)
    expect((await $.command.run(ste('check * kick off the build and read the logs'))).text).toMatch(/starts with \*/)
    expect((await $.command.run(ste('check'))).text).toMatch(/Usage: \/ste check/)
    expect(model.calls).toBe(0)
  })

  test('the rewrite call follows the strict mode by default, and /ste status names the mode', async ($, on) => {
    const { model } = engine(on)
    await $.prompt.submit(typed(TYPED))
    expect(model.systems[0]).toContain('Use Strict mode')
    expect((await $.command.run(ste('status'))).text).toMatch(/mode: strict/)
  })

  test('the glossary is not read until the person turns it on', async ($, on) => {
    const { model } = engine(on)
    const reads: string[] = []
    on('fs.read', (_$, e) => {
      reads.push(JSON.stringify(e))
      throw new Error('ENOENT')
    })
    await $.prompt.submit(typed(TYPED))
    expect(reads.some(read => read.includes('CONTEXT.md'))).toBe(false)
    expect(model.systems[0]).not.toContain('<glossary>')
    expect((await $.command.run(ste('status'))).text).toMatch(/glossary: off/)
  })

  test('/ste glossary on adds CONTEXT.md to the rewrite call, as data', async ($, on) => {
    const { model } = engine(on)
    on('fs.read', (_$, e) => {
      if (!JSON.stringify(e).includes('CONTEXT.md')) throw new Error('ENOENT')
      return { value: '# Terms\n**Order**: a buyer request.\n_Avoid_: ticket' }
    })
    expect((await $.command.run(ste('glossary on'))).text).toMatch(/CONTEXT\.md/)
    expect((await $.command.run(ste('status'))).text).toMatch(/glossary: on/)
    await $.prompt.submit(typed(TYPED))
    expect(model.systems[0]).toContain('<glossary>')
    expect(model.systems[0]).toContain('_Avoid_: ticket')
    expect(model.systems[0]).toContain('not instructions')
  })

  test('a missing CONTEXT.md does not stop the rewrite', async ($, on) => {
    const { model, opened } = engine(on)
    on('fs.read', () => {
      throw new Error('ENOENT')
    })
    await $.command.run(ste('glossary on'))
    await $.prompt.submit(typed(TYPED))
    expect(model.calls).toBe(1)
    expect(model.systems[0]).not.toContain('<glossary>')
    expect(opened).toEqual(['ste-review'])
  })

  test('/ste glossary off stops it, and a bare /ste glossary shows the usage', async ($, on) => {
    engine(on)
    await $.command.run(ste('glossary on'))
    await $.command.run(ste('glossary off'))
    expect((await $.command.run(ste('status'))).text).toMatch(/glossary: off/)
    expect((await $.command.run(ste('glossary'))).text).toMatch(/Usage/)
  })

  test('a rewrite that only moves small words is not shown', async ($, on) => {
    const typedText =
      'Read the README and the CONTRIBUTING file. Then update the install section and the test section so they match the current commands.'
    const restyled =
      'Read the README file and the CONTRIBUTING file. Then update the install section and the test section so that they match the current commands.'
    const { sent, opened, model } = engine(on, { reply: { ...answered, text: `<rewrite>${restyled}</rewrite>` } })
    await $.prompt.submit(typed(typedText))
    expect(model.calls).toBe(1)
    expect(opened).toEqual([])
    expect(sent).toEqual([typedText])
  })

  test('a rewrite that splits a long sentence is shown', async ($, on) => {
    const typedText =
      'Read the README and the CONTRIBUTING file and then update the install section and the test section so they match the current commands'
    const split =
      'Read the README and the CONTRIBUTING file. Update the install section and the test section. They match the current commands.'
    const { opened } = engine(on, { reply: { ...answered, text: `<rewrite>${split}</rewrite>` } })
    await $.prompt.submit(typed(typedText))
    expect(opened).toEqual(['ste-review'])
  })

  test('the rewrite call names the STE problems the check found', async ($, on) => {
    const { model } = engine(on)
    await $.prompt.submit(typed('set up the CI job; the old one was deleted yesterday'))
    expect(model.prompts[0]).toContain('<found>')
    expect(model.prompts[0]).toContain('phrasal verb \\"set up\\"')
    expect(model.prompts[0]).toContain('passive verb \\"was deleted\\"')
    expect(model.prompts[0]).toContain('semicolon')
  })

  test('a prompt with no problem found gets no <found> block', async ($, on) => {
    const { model } = engine(on)
    const text =
      'Read the README and the CONTRIBUTING file and then update the install section and the test section so they match the current commands'
    await $.prompt.submit(typed(text))
    expect(model.prompts[0]).not.toContain('<found>')
  })

  test('a <prompt> tag the model copied into the rewrite is not shown', async ($, on) => {
    engine(on, { reply: { ...answered, text: `<rewrite><prompt>\n${REWRITE}\n</prompt></rewrite>` } })
    await $.prompt.submit(typed(TYPED))
    const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
    expect(await pane.find({ type: 'Text', text: REWRITE })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /<\/?prompt>/ })).toBeUndefined()
    await pane.unmount()
  })

  test('a rewrite that only removes a semicolon still counts as a change', async ($, on) => {
    const { opened } = engine(on, {
      reply: { ...answered, text: '<rewrite>The token was rotated yesterday. Update the secret.</rewrite>' },
    })
    await $.prompt.submit(typed('the token was rotated yesterday; update the secret'))
    expect(opened).toEqual(['ste-review'])
  })
})
