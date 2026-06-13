import type { Request, Response } from 'express'
import { getDocumentsByUser } from '../services/document-service'

export function getDocumentsController(req: Request, res: Response) {
  const documents = getDocumentsByUser(req.context.currentUserId)

  res.json({
    data: documents,
    meta: {
      count: documents.length,
      requestId: req.context.requestId,
      currentUserId: req.context.currentUserId,
    },
  })
}
