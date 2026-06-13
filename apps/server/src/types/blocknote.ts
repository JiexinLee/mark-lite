export type BlockNoteTextContent = {
  type: 'text'
  text: string
  styles: Record<string, string | boolean>
}

export type BlockNoteBlock = {
  id?: string
  type: string
  props?: Record<string, unknown>
  content?: BlockNoteTextContent[]
  children?: BlockNoteBlock[]
}
