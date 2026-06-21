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
import { DefaultChatTransport } from "ai";

export type EditorAIConfig = {
  baseUrl?: string;
  chatPath?: string;
  enabled?: boolean;
  unavailableReason?: string;
};

type AIAvailabilityState =
  | { status: "available" }
  | { status: "unavailable"; reason: string };

export type BlockNoteEditorProps = {
  className?: string;
  aiConfig?: Partial<EditorAIConfig>;
};

export function BlockNoteEditor({
  className = "bn-container",
  aiConfig,
}: BlockNoteEditorProps) {
  const resolvedAIConfig = createEditorAIConfig(aiConfig);
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

function createEditorAIConfig(
  config: Partial<EditorAIConfig> = {},
): Required<EditorAIConfig> {
  return {
    baseUrl: config.baseUrl ?? "http://localhost:3001/api",
    chatPath: config.chatPath ?? "/chat",
    enabled: config.enabled ?? true,
    unavailableReason:
      config.unavailableReason ?? "AI is disabled by configuration.",
  };
}

function getAIAvailabilityState(
  config: Required<EditorAIConfig>,
): AIAvailabilityState {
  if (!config.enabled) {
    return {
      status: "unavailable",
      reason: config.unavailableReason,
    };
  }

  return { status: "available" };
}

function createBlockNoteChatTransport(config: Required<EditorAIConfig>) {
  return new DefaultChatTransport({
    api: `${config.baseUrl}${config.chatPath}`,
  });
}
