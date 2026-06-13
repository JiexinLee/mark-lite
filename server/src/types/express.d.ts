import type { RequestContext } from '../middleware/request-context'

declare global {
  namespace Express {
    interface Request {
      context: RequestContext
    }
  }
}

export {}
