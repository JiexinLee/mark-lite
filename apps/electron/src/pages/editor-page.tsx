import { useEffect, useState } from 'react'
import {
  BlockNoteEditor,
  createEmptyDocument,
  type EditorDocument,
} from '@mark-lite/editor'
import { createDesktopApiClient } from '../api/client'
import { getDocuments } from '../api/documents'
import { LayoutShell } from '../components/layout-shell'
import { detectRuntime } from '../utils/platform'

const currentDocument: EditorDocument = {
  id: 'welcome-doc',
  title: 'Welcome document',
  updatedAt: 'Just now',
}

const apiClient = createDesktopApiClient()
const runtime = detectRuntime()

export function EditorPage() {
  const [documents, setDocuments] = useState<EditorDocument[]>([currentDocument])
  const [document, setDocument] = useState<EditorDocument>(currentDocument)

  useEffect(() => {
    let cancelled = false

    async function loadDocuments() {
      try {
        const response = await getDocuments()
        const firstDocument = response.data[0]

        if (!cancelled && response.data.length > 0) {
          setDocuments(response.data)
        }

        if (!cancelled && firstDocument) {
          setDocument(firstDocument)
        }
      } catch (error) {
        console.error('Failed to load documents', error)
      }
    }

    void loadDocuments()

    return () => {
      cancelled = true
    }
  }, [])

  function handleCreateDocument() {
    const newDocument = createEmptyDocument(documents.length + 1)

    setDocuments((currentDocuments) => [newDocument, ...currentDocuments])
    setDocument(newDocument)
  }

  return (
    <LayoutShell
      document={document}
      documents={documents}
      onCreateDocument={handleCreateDocument}
      onSelectDocument={setDocument}
    >
      <header className="content__header">
        <div>
          <h2 className="content__title">BlockNote workspace</h2>
          <p className="content__description">
            The project is ready for desktop-first editing features. Start by
            building pages, features, models, and API integrations on top of
            this workspace.
          </p>
        </div>
        <div className="content__pill">
          {runtime} · {apiClient.baseUrl}
        </div>
      </header>

      <section className="editor-surface">
        <div className="editor-surface__toolbar">
          <div>
            <h3 className="editor-surface__title">Editor canvas</h3>
            <p className="editor-surface__meta">
              A minimal BlockNote editor is mounted and ready for product
              development.
            </p>
          </div>
          <p className="editor-surface__hint">Use / commands to insert blocks.</p>
        </div>

        <div className="editor-surface__body">
          <BlockNoteEditor aiConfig={{ baseUrl: apiClient.baseUrl }} />
        </div>
      </section>
    </LayoutShell>
  )
}
