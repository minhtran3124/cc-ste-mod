import type { EngineInterface, On, ResolveInput } from 'claude-code'
import { describe, expect, mock, test } from 'claude-code/testing'

import { GATE_CASES } from './fixtures/gate-cases'
import { MEANING_CASES } from './fixtures/meaning-cases'

const SCROLL = { offset: 0, bodyRows: 19 }
const PANE = {
  plugin: 'ste-refine',
  component: 'Pane',
  requestId: 'ste-review',
  props: { title: 'STE100 rewrite', isFocused: true, bodyColumns: 100, placement: 'inline', scroll: SCROLL, view: {} },
} as const
const USAGE = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }

const ste = (args: string) => ({
  command: 'ste',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: false, columns: 100 },
})

const typed = (text: string) => ({ text, wait: false, origin: { kind: 'composer' } as const })

// The engine beneath the mod, with a model that always answers with `rewrite`.
function engine(on: On, rewrite: string) {
  const model = { calls: 0 }
  const panes = new Set<string>()
  const promptBox = { text: '' }
  mock.clock(on)
  on('prompt.read', () => ({ value: { text: promptBox.text, cursor: promptBox.text.length } }))
  on('prompt.fill', (_$, e) => {
    promptBox.text = e.text
    return { isFilled: true }
  })
  on('model.complete', () => {
    model.calls += 1
    return { value: { isAnswered: true, text: `<rewrite>${rewrite}</rewrite>`, usage: USAGE } }
  })
  const stored = new Map<string, unknown>()
  on('store.get', (_$, e) => ({ value: stored.get(e.key) }))
  on('store.set', (_$, e) => {
    stored.set(e.key, e.value)
    return { value: undefined }
  })
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('ui.open', (_$, e) => {
    panes.add(e.id)
    return { value: { isPlaced: true } }
  })
  on('ui.close', (_$, e) => {
    panes.delete(e.id)
    return { value: undefined }
  })
  on('ui.focus', () => ({}))
  on('ui.panes', () => ({
    value: [...panes].map(id => ({ id, title: id, isShown: true, isFocused: true, isPlaced: true })),
  }))
  on('ui.render', ($: EngineInterface, e: ResolveInput) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  return { model }
}

const label = (text: string) => JSON.stringify(text.length > 50 ? `${text.slice(0, 50)}…` : text)

// Does the gate send each prompt to the model, or send it as typed? Both the /ste check answer
// and the real prompt path must agree with the label.
describe('eval: gate', () => {
  for (const { text, goes } of GATE_CASES)
    test(`${goes}: ${label(text)}`, async ($, on) => {
      const { model } = engine(on, 'Start the build.')
      const check = (await $.command.run(ste(`check ${text}`))).text
      expect(check).toMatch(goes === 'rewrite' ? /It gets a rewrite/ : /It goes as typed/)
      await $.prompt.submit(typed(text))
      expect(model.calls).toBe(goes === 'rewrite' ? 1 : 0)
    })
})

// Does the review name what a rewrite lost, and start on Edit, and only then?
describe('eval: meaning', () => {
  for (const { name, original, rewrite, lost } of MEANING_CASES)
    test(name, async ($, on) => {
      engine(on, rewrite)
      await $.prompt.submit(typed(original))
      const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
      const button = async (key: string) => (await pane.find({ type: 'Button', key }))?.props.autoFocus
      if (lost.length === 0) {
        expect(await button('accept')).toBe(true)
        expect(await button('edit')).toBeUndefined()
      } else {
        const warning = `The rewrite lost ${lost.join(', ')}. Check it before you accept.`
        expect(await pane.find({ type: 'Text', text: warning })).toBeDefined()
        expect(await button('edit')).toBe(true)
        expect(await button('accept')).toBeUndefined()
      }
      await pane.unmount()
    })
})
