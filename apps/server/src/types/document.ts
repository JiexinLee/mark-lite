import type { BlockNoteBlock } from './blocknote'

export type DocumentSummary = {
  id: string
  userId: string
  title: string
  updatedAt: string
  preview: string
  blocks: BlockNoteBlock[]
}
