import type { NextFunction, Request, Response } from 'express'
import { aiWorkspaceRuntimeEnv } from '@mark-lite/ai-workspace'
import { randomUUID } from 'node:crypto'

export type RequestContext = {
  requestId: string
  currentUserId: string
}

export function attachRequestContext(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  req.context = {
    requestId: randomUUID(),
    currentUserId: req.header('x-user-id') || aiWorkspaceRuntimeEnv.DEFAULT_USER_ID,
  }

  next()
}
