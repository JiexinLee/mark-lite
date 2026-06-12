import type { EditorDocument } from '../../lib/models/document'

type SidebarProps = {
  runtime: string
  endpoint: string
  document: EditorDocument
}

export function Sidebar({ runtime, endpoint, document }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <p className="sidebar__eyebrow">Mark Lite</p>
        <h1 className="sidebar__title">Desktop editor starter</h1>
        <p className="sidebar__subtitle">
          React + Vite + TypeScript + Electron with BlockNote.
        </p>
      </div>

      <div className="sidebar__stack">
        <section className="sidebar__card">
          <span className="sidebar__label">Current runtime</span>
          <p className="sidebar__value">{runtime}</p>
        </section>

        <section className="sidebar__card">
          <span className="sidebar__label">API endpoint</span>
          <p className="sidebar__value">{endpoint}</p>
        </section>

        <section className="sidebar__card">
          <span className="sidebar__label">Open document</span>
          <p className="sidebar__value">{document.title}</p>
        </section>

        <section className="sidebar__card">
          <span className="sidebar__label">Last updated</span>
          <p className="sidebar__value">{document.updatedAt}</p>
        </section>
      </div>
    </aside>
  )
}
