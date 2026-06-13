import type { BlockNoteEditor as BlockNoteEditorInstance } from '@blocknote/core'
import { filterSuggestionItems } from '@blocknote/core/extensions'
import { en } from '@blocknote/core/locales'
import { BlockNoteView } from '@blocknote/mantine'
import {
  FormattingToolbar,
  FormattingToolbarController,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  useCreateBlockNote,
} from '@blocknote/react'
import {
  AIMenuController,
  AIToolbarButton,
  AIExtension,
  getAISlashMenuItems,
} from '@blocknote/xl-ai'
import { en as aiEn } from '@blocknote/xl-ai/locales'
import { DefaultChatTransport } from 'ai'

const aiBaseUrl =
  import.meta.env.VITE_BLOCKNOTE_AI_BASE_URL ?? 'http://localhost:3001/api'

export function BlockNoteEditor() {
  const editor = useCreateBlockNote({
    dictionary: {
      ...en,
      ai: aiEn,
    },
    extensions: [
      AIExtension({
        transport: new DefaultChatTransport({
          api: `${aiBaseUrl}/chat`,
        }),
      }),
    ],
  })

  return (
    <BlockNoteView
      editor={editor}
      theme="dark"
      className="bn-container"
      formattingToolbar={false}
      slashMenu={false}
    >
      <AIMenuController />
      <FormattingToolbarWithAI />
      <SuggestionMenuWithAI editor={editor} />
    </BlockNoteView>
  )
}

function FormattingToolbarWithAI() {
  return (
    <FormattingToolbarController
      formattingToolbar={() => (
        <FormattingToolbar>
          {getFormattingToolbarItems()}
          <AIToolbarButton />
        </FormattingToolbar>
      )}
    />
  )
}

function SuggestionMenuWithAI({ editor }: { editor: BlockNoteEditorInstance }) {
  return (
    <SuggestionMenuController
      triggerCharacter="/"
      getItems={async (query) =>
        filterSuggestionItems(
          [
            ...getDefaultReactSlashMenuItems(editor),
            ...getAISlashMenuItems(editor),
          ],
          query,
        )
      }
    />
  )
}
