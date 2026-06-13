import { createUIMessageStream } from 'ai'
import type { BlockNoteBlock } from '../types/blocknote'
import {
  createHeadingBlock,
  createParagraphBlock,
  extractPromptFromMessages,
} from '../utils/blocknote'

export type ChatRequestPayload = {
  documentId?: string | undefined
  prompt?: string | undefined
  messages?: unknown[] | undefined
}

export type ChatResult = {
  assistantText: string
  blocks: BlockNoteBlock[]
}

export function buildChatResult(payload: ChatRequestPayload): ChatResult {
  const prompt = payload.prompt?.trim() || extractPromptFromMessages(payload.messages)
  const normalizedPrompt = prompt || 'Help me continue editing this document.'

  return {
    assistantText:
      `I received your BlockNote request: "${normalizedPrompt}". ` +
      'This is a starter Express endpoint. Replace this mock response with your LLM workflow later.',
    blocks: [
      createHeadingBlock('AI Draft', 2),
      createParagraphBlock(`Original request: ${normalizedPrompt}`),
      createParagraphBlock(
        'This mock response is already in BlockNote block format, so the frontend can render or insert it directly.',
      ),
    ],
  }
}

export function createChatStream(payload: ChatRequestPayload) {
  const result = buildChatResult(payload)

  const stream = createUIMessageStream({
    execute({ writer }) {
      writer.write({
        type: 'data-blocks',
        data: {
          documentId: payload.documentId ?? 'draft-document',
          blocks: result.blocks,
        },
      })

      writer.write({
        type: 'text-start',
        id: 'assistant-response',
      })

      writer.write({
        type: 'text-delta',
        id: 'assistant-response',
        delta: result.assistantText,
      })

      writer.write({
        type: 'text-end',
        id: 'assistant-response',
      })
    },
  })

  return {
    stream,
    result,
  }
}
