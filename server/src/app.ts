import compression from 'compression'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env'
import { errorHandler } from './middleware/error-handler'
import { notFoundHandler } from './middleware/not-found'
import { attachRequestContext } from './middleware/request-context'
import { apiRouter } from './routes/index'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    }),
  )
  app.use(helmet())
  app.use(compression())
  app.use(cookieParser())
  app.use(morgan('dev'))
  app.use(express.json({ limit: '2mb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use(attachRequestContext)

  app.use('/api', apiRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
