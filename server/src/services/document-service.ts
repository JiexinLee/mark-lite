import type { DocumentSummary } from '../types/document'
import { createHeadingBlock, createParagraphBlock } from '../utils/blocknote'

const demoDocuments: DocumentSummary[] = [
  {
    id: 'doc-welcome',
    userId: 'demo-user',
    title: 'Welcome document',
    updatedAt: new Date().toISOString(),
    preview: 'Kick off your BlockNote desktop workspace.',
    blocks: [
      createHeadingBlock('Welcome document', 1),
      createParagraphBlock('Kick off your BlockNote desktop workspace.'),
    ],
  },
  {
    id: 'doc-product-spec',
    userId: 'demo-user',
    title: 'Product spec',
    updatedAt: new Date().toISOString(),
    preview: 'Outline core flows, editor UX, and collaboration features.',
    blocks: [
      createHeadingBlock('Product spec', 1),
      createParagraphBlock(
        'Outline core flows, editor UX, and collaboration features.',
      ),
    ],
  },
]

export function getDocumentsByUser(userId: string) {
  return demoDocuments.filter((document) => document.userId === userId)
}
