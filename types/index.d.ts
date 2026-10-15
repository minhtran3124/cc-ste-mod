export type Proposal = {
  original: string
  refined: string
  note?: string
  // Short names of the STE rules the rewrite applied, for the "Why" line.
  reasons?: string[]
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
    }
  }
}
