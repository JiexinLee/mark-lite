import type { ReactNode } from "react";
import type { EditorDocument } from "../lib/models/document";
import { Sidebar } from "../features/sidebar/sidebar";

type LayoutShellProps = {
  children: ReactNode;
  document: EditorDocument;
  endpoint: string;
  runtime: string;
};

export function LayoutShell({
  children,
  document,
  endpoint,
  runtime,
}: LayoutShellProps) {
  return (
    <div className="app-shell">
      <Sidebar runtime={runtime} endpoint={endpoint} document={document} />

      <main className="content">{children}</main>
    </div>
  );
}
