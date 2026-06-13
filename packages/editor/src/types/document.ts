export interface EditorDocument {
  id: string
  title: string
  updatedAt: string
  preview?: string
}

export interface EditorBlockText {
  type: 'text'
  text: string
  styles: Record<string, string | boolean>
}

export interface EditorBlock {
  id?: string
  type: string
  props?: Record<string, unknown>
  content?: EditorBlockText[]
  children?: EditorBlock[]
}
