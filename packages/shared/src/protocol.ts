/**
 * WebSocket 协议类型 (CLI Channel)
 */

// ── 客户端 → gateway ──

export interface UserInputMessage {
  type: "user_input";
  message: string;
  files?: string[];
  fileData?: ClientFile[];
}

export interface SlashCommandMessage {
  type: "slash_command";
  command: string;
  args?: string;
}

export type CliWsClientMessage = UserInputMessage | SlashCommandMessage;

// ── gateway → 客户端 ──

export interface SessionCreatedMessage {
  type: "session_created";
  name: string;
  workspaceDir: string;
  label?: string;
  model?: string;
  providerName?: string;
  agentMode?: string;
  commands?: CommandInfo[];
}

export interface AgentEventMessage {
  type: "agent_event";
  event: unknown; // AgentEvent, 避免循环引用
}

export interface DispatchDoneMessage {
  type: "dispatch_done";
  success: boolean;
  images?: string[];
  agentMode?: string;
}

export interface CommandResultMessage {
  type: "command_result";
  text: string;
}

export interface PromptResultMessage {
  type: "prompt_result";
  text: string;
}

export interface QueuePendingMessage {
  type: "queue_pending";
  position: number;
  totalQueued: number;
}

export interface ErrorMessage {
  type: "error";
  message: string;
}

export type CliWsServerMessage =
  | SessionCreatedMessage
  | AgentEventMessage
  | DispatchDoneMessage
  | CommandResultMessage
  | PromptResultMessage
  | QueuePendingMessage
  | ErrorMessage;

// ── 共享类型 ──

export interface ClientFile {
  name: string;
  data: string; // base64
  mimeType: string;
}

export interface CommandInfo {
  name: string;
  description: string;
  aliases?: string[];
  subcommands?: string[];
  args?: string;
  help?: string;
}
