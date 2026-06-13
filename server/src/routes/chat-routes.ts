import { Router } from 'express'
import { postChatController } from '../controllers/chat-controller'

export const chatRouter = Router()

chatRouter.post('/', postChatController)
