import type { NextFunction, Request, Response } from 'express'
import { randomUUID } from 'node:crypto'
import { env } from '../config/env'

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
    currentUserId: req.header('x-user-id') || env.DEFAULT_USER_ID,
  }

  next()
}
