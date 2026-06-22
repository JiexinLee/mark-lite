"use client";

import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "@blocknote/xl-ai/style.css";

import type { BlockNoteEditor as BlockNoteEditorInstance } from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
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
import { useMemo } from "react";

import { createEditorAITransport } from "../editor-ai-transport";
import type {
  DocumentEditorAIConfig,
  DocumentEditorProps,
} from "../types";
import { createEditorOptions } from "./create-editor-options";
import { getDefaultInitialContent } from "./initial-content";
import { fromBlockNoteBlocks } from "./serialization";

type AIAvailabilityState =
  | { status: "available" }
  | { status: "unavailable"; reason: string };

export function DocumentEditor({
  className = "bn-container",
  documentId,
  documentTitle,
  initialContent,
  editable = true,
  ai,
  onChange,
}: DocumentEditorProps) {
  const resolvedAIConfig = createDocumentEditorAIConfig(ai);
  const aiState = getAIAvailabilityState(resolvedAIConfig);
  const resolvedInitialContent = initialContent ?? getDefaultInitialContent();

  const transport = useMemo(() => {
    if (aiState.status !== "available") {
      return undefined;
    }

    return createEditorAITransport({
      baseUrl: resolvedAIConfig.baseUrl,
      chatPath: resolvedAIConfig.chatPath,
      documentId,
      documentTitle,
    });
  }, [
    aiState.status,
    documentId,
    documentTitle,
    resolvedAIConfig.baseUrl,
    resolvedAIConfig.chatPath,
  ]);

  const editorOptions = useMemo(
    () =>
      createEditorOptions({
        editable,
        initialContent: resolvedInitialContent,
        extensions: transport ? [AIExtension({ transport })] : [],
      }),
    [editable, resolvedInitialContent, transport],
  );

  const editor = useCreateBlockNote(editorOptions, [
    documentId,
    documentTitle,
    editable,
    transport,
  ]);

  return (
    <MantineProvider defaultColorScheme="dark">
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme="dark"
        className={className}
        formattingToolbar={false}
        slashMenu={false}
        onChange={() => {
          onChange?.(fromBlockNoteBlocks(editor.document as unknown[]));
        }}
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

function createDocumentEditorAIConfig(
  config: DocumentEditorAIConfig | undefined,
): Required<DocumentEditorAIConfig> {
  return {
    baseUrl: config?.baseUrl ?? "http://localhost:3001/api",
    chatPath: config?.chatPath ?? "/chat",
    enabled: config?.enabled ?? true,
    unavailableReason:
      config?.unavailableReason ?? "AI is disabled by configuration.",
  };
}

function getAIAvailabilityState(
  config: Required<DocumentEditorAIConfig>,
): AIAvailabilityState {
  if (!config.enabled) {
    return {
      status: "unavailable",
      reason: config.unavailableReason,
    };
  }

  return { status: "available" };
}
