import type { BlockNoteBlock } from '../types/blocknote'

export function createTextContent(text: string) {
  return [
    {
      type: 'text' as const,
      text,
      styles: {},
    },
  ]
}

export function createParagraphBlock(text: string): BlockNoteBlock {
  return {
    type: 'paragraph',
    content: createTextContent(text),
  }
}

export function createHeadingBlock(text: string, level = 2): BlockNoteBlock {
  return {
    type: 'heading',
    props: { level },
    content: createTextContent(text),
  }
}

export function extractPromptFromMessages(messages: unknown[] | undefined): string {
  if (!messages || messages.length === 0) {
    return ''
  }

  for (const candidate of [...messages].reverse()) {
    if (!candidate || typeof candidate !== 'object') {
      continue
    }

    const role = Reflect.get(candidate, 'role')
    const parts = Reflect.get(candidate, 'parts')
    const content = Reflect.get(candidate, 'content')

    if (role !== 'user') {
      continue
    }

    if (typeof content === 'string' && content.trim()) {
      return content.trim()
    }

    if (Array.isArray(parts)) {
      const text = parts
        .map((part) => {
          if (!part || typeof part !== 'object') {
            return ''
          }

          const type = Reflect.get(part, 'type')
          if (type === 'text') {
            const value = Reflect.get(part, 'text')
            return typeof value === 'string' ? value : ''
          }

          return ''
        })
        .join(' ')
        .trim()

      if (text) {
        return text
      }
    }
  }

  return ''
}
