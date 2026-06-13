import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "@blocknote/xl-ai/style.css";

import type { BlockNoteEditor as BlockNoteEditorInstance } from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import { en } from "@blocknote/core/locales";
import { BlockNoteView } from "@blocknote/mantine";
import {
  FormattingToolbar,
  FormattingToolbarController,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  useCreateBlockNote,
} from "@blocknote/react";
import {
  AIMenuController,
  AIToolbarButton,
  AIExtension,
  getAISlashMenuItems,
} from "@blocknote/xl-ai";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import {
  adaptElectronAIConfig,
  createBlockNoteChatTransport,
  getAIAvailabilityState,
  type AIWorkspaceConfig,
} from "@mark-lite/ai-workspace";

export type BlockNoteEditorProps = {
  className?: string;
  aiConfig?: Partial<AIWorkspaceConfig>;
};

export function BlockNoteEditor({
  className = "bn-container",
  aiConfig,
}: BlockNoteEditorProps) {
  const resolvedAIConfig = adaptElectronAIConfig(aiConfig);
  const aiState = getAIAvailabilityState(resolvedAIConfig);

  const editor = useCreateBlockNote({
    dictionary: {
      ...en,
      ai: aiEn,
    },
    extensions:
      aiState.status === "available"
        ? [
            AIExtension({
              transport: createBlockNoteChatTransport(resolvedAIConfig),
            }),
          ]
        : [],
  });

  return (
    <MantineProvider defaultColorScheme="dark">
      <BlockNoteView
        editor={editor}
        theme="dark"
        className={className}
        formattingToolbar={false}
        slashMenu={false}
      >
        {aiState.status === "available" ? <AIMenuController /> : null}
        <FormattingToolbarWithAI enabled={aiState.status === "available"} />
        <SuggestionMenuWithAI
          editor={editor}
          aiEnabled={aiState.status === "available"}
        />
      </BlockNoteView>
    </MantineProvider>
  );
}

function FormattingToolbarWithAI({ enabled }: { enabled: boolean }) {
  return (
    <FormattingToolbarController
      formattingToolbar={() => (
        <FormattingToolbar>
          {getFormattingToolbarItems()}
          {enabled ? <AIToolbarButton /> : null}
        </FormattingToolbar>
      )}
    />
  );
}

function SuggestionMenuWithAI({
  editor,
  aiEnabled,
}: {
  editor: BlockNoteEditorInstance;
  aiEnabled: boolean;
}) {
  return (
    <SuggestionMenuController
      triggerCharacter="/"
      getItems={async (query: string) =>
        filterSuggestionItems(
          [
            ...getDefaultReactSlashMenuItems(editor),
            ...(aiEnabled ? getAISlashMenuItems(editor) : []),
          ],
          query,
        )
      }
    />
  );
}
