import type { AIWorkspaceActionKey } from '@mark-lite/ai-workspace'
import { pipeUIMessageStreamToResponse } from 'ai'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { createChatStream } from '../services/chat-service'
import { asyncHandler } from '../utils/http'

const ChatBodySchema = z.object({
  documentId: z.string().optional(),
  prompt: z.string().optional(),
  messages: z.array(z.unknown()).optional(),
  actionKey: z
    .enum([
      'rewrite',
      'polish',
      'expand',
      'translate-to-en',
      'summarize-document',
      'find-citations',
    ] satisfies [AIWorkspaceActionKey, ...AIWorkspaceActionKey[]])
    .optional(),
})

export const postChatController = asyncHandler(async function postChatController(
  req: Request,
  res: Response,
) {
  const payload = ChatBodySchema.parse(req.body)
  const { stream } = await createChatStream(payload)

  pipeUIMessageStreamToResponse({
    response: res,
    stream,
    headers: {
      'x-request-id': req.context.requestId,
    },
  })
})
