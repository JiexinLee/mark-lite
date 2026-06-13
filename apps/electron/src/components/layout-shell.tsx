import type { ReactNode } from 'react'
import type { EditorDocument } from '@mark-lite/editor'
import { Sidebar } from '../features/sidebar/sidebar'

type LayoutShellProps = {
  children: ReactNode
  document: EditorDocument
  documents: EditorDocument[]
  onCreateDocument: () => void
  onSelectDocument: (document: EditorDocument) => void
}

export function LayoutShell({
  children,
  document,
  documents,
  onCreateDocument,
  onSelectDocument,
}: LayoutShellProps) {
  return (
    <div className="app-shell">
      <Sidebar
        document={document}
        documents={documents}
        onCreateDocument={onCreateDocument}
        onSelectDocument={onSelectDocument}
      />

      <main className="content">{children}</main>
    </div>
  )
}
