import type { NextFunction, Request, Response } from 'express'

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const message = error instanceof Error ? error.message : 'Internal server error'

  res.status(500).json({
    message,
    requestId: req.context?.requestId,
  })
}
