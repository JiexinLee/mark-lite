import {
  DefaultChatTransport,
  type PrepareSendMessagesRequest,
  type UIMessage,
} from "ai";

type CreateEditorAITransportInput = {
  baseUrl: string;
  chatPath: string;
  documentId?: string;
  documentTitle?: string;
};

export function createEditorAITransport({
  baseUrl,
  chatPath,
  documentId,
  documentTitle,
}: CreateEditorAITransportInput) {
  const prepareSendMessagesRequest: PrepareSendMessagesRequest<UIMessage> =
    async ({ messages, body }) => ({
      body: {
        ...(body ?? {}),
        messages,
        ...(documentId?.trim() ? { documentId: documentId.trim() } : {}),
        ...(documentTitle?.trim() ? { title: documentTitle.trim() } : {}),
      },
    });

  return new DefaultChatTransport<UIMessage>({
    api: `${baseUrl}${chatPath}`,
    prepareSendMessagesRequest,
  });
}
