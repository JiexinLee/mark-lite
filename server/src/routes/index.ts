import { Router } from 'express'
import { chatRouter } from './chat-routes'
import { documentRouter } from './document-routes'

export const apiRouter = Router()

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

apiRouter.use('/documents', documentRouter)
apiRouter.use('/chat', chatRouter)
