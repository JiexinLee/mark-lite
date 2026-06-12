import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";

export function BlockNoteEditor() {
  const editor = useCreateBlockNote();

  return (
    <BlockNoteView editor={editor} theme="dark" className="bn-container" />
  );
}
