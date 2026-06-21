import { DOCUMENT_ACTIONS } from "./document";
import { RESEARCH_ACTIONS } from "./research";
import { TRANSLATION_ACTIONS } from "./translation";
import { WRITING_ACTIONS } from "./writing";
import type { AIWorkspaceAction, AIWorkspaceActionKey } from "../types";

export {
  DOCUMENT_ACTIONS,
  RESEARCH_ACTIONS,
  TRANSLATION_ACTIONS,
  WRITING_ACTIONS,
};

export const DEFAULT_AI_WORKSPACE_ACTIONS: AIWorkspaceAction[] = [
  ...WRITING_ACTIONS,
  ...TRANSLATION_ACTIONS,
  ...DOCUMENT_ACTIONS,
  ...RESEARCH_ACTIONS,
];

export function getAIWorkspaceActions(): AIWorkspaceAction[] {
  return DEFAULT_AI_WORKSPACE_ACTIONS;
}

export function getAIWorkspaceActionByKey(
  key: AIWorkspaceActionKey | string,
): AIWorkspaceAction | undefined {
  return DEFAULT_AI_WORKSPACE_ACTIONS.find((action) => action.key === key);
}
