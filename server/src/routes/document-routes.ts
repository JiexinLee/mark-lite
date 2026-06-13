import { Router } from 'express'
import { getDocumentsController } from '../controllers/document-controller'

export const documentRouter = Router()

documentRouter.get('/', getDocumentsController)
