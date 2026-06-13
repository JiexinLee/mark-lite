import { pipeUIMessageStreamToResponse } from 'ai'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { createChatStream } from '../services/chat-service'

const ChatBodySchema = z.object({
  documentId: z.string().optional(),
  prompt: z.string().optional(),
  messages: z.array(z.unknown()).optional(),
})

export function postChatController(req: Request, res: Response) {
  const payload = ChatBodySchema.parse(req.body)
  const { stream } = createChatStream(payload)

  pipeUIMessageStreamToResponse({
    response: res,
    stream,
    headers: {
      'x-request-id': req.context.requestId,
    },
  })
}
