export type Proposal = {
  original: string
  refined: string
  note?: string
  // Short names of the STE rules the rewrite applied, for the "Why" line.
  reasons?: string[]
  // What the rewrite lost from the prompt: code, URLs, paths, numbers or a negation. Set only when it lost some.
  lost?: string[]
  isEditing?: boolean
  inPane?: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'ste-refine': {
      proposal: Proposal | null
      isEnabled: boolean
      // Denies in a row since the last Accept, Edit or pause.
      denyStreak: number
      // Whether the rewrite follows CONTEXT.md in the project.
      useGlossary: boolean
    }
  }
}
