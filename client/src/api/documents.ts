import { createDesktopApiClient, requestJson } from './client'
import type { EditorDocument } from '../lib/models/document'

type DocumentsResponse = {
  data: Array<
    EditorDocument & {
      preview: string
      userId: string
      blocks: unknown[]
    }
  >
  meta: {
    count: number
    requestId: string
    currentUserId: string
  }
}

const apiClient = createDesktopApiClient()

export async function getDocuments() {
  return requestJson<DocumentsResponse>(apiClient, '/documents')
}
