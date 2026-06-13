import { FileText, Plus, Sparkles } from 'lucide-react'
import type { EditorDocument } from '@mark-lite/editor'
import { Button } from '../../components/ui/button'

type SidebarProps = {
  document: EditorDocument
  documents: EditorDocument[]
  onCreateDocument: () => void
  onSelectDocument: (document: EditorDocument) => void
}

export function Sidebar({
  document,
  documents,
  onCreateDocument,
  onSelectDocument,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__brand-row">
          <div className="sidebar__logo">
            <Sparkles size={18} />
          </div>
          <div>
            <p className="sidebar__eyebrow">Mark Lite</p>
            <h1 className="sidebar__title">Documents</h1>
          </div>
        </div>
      </div>

      <div className="sidebar__actions">
        <Button className="sidebar__create" onClick={onCreateDocument}>
          <Plus />
          Create New
        </Button>
      </div>

      <nav className="sidebar__documents" aria-label="Documents">
        {documents.map((item) => {
          const isActive = item.id === document.id

          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar__document ${isActive ? 'sidebar__document--active' : ''}`}
              onClick={() => onSelectDocument(item)}
            >
              <span className="sidebar__document-icon">
                <FileText size={18} />
              </span>
              <span className="sidebar__document-content">
                <span className="sidebar__document-title">{item.title}</span>
                <span className="sidebar__document-meta">
                  {item.preview || item.updatedAt}
                </span>
              </span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
