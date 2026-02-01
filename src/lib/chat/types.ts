// Chat message types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  timestamp: number;
}

// Tool call from the LLM
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

// Result after executing a tool
export interface ToolResult {
  toolCallId: string;
  name: string;
  result: unknown;
  success: boolean;
  error?: string;
}

// OpenRouter message format with tool support
export interface OpenRouterChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

// OpenRouter tool definition
export interface OpenRouterTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

// OpenRouter response with tool calls
export interface OpenRouterChatResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: 'stop' | 'tool_calls' | 'length';
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Chat API request body
export interface ChatRequest {
  messages: OpenRouterChatMessage[];
  model?: string;
}

// Chat API response body
export interface ChatResponse {
  message: {
    role: string;
    content: string | null;
    tool_calls?: ToolCall[];
  };
  finish_reason: string;
}

// Tool execution parameters
export interface CreateShapeParams {
  width: number;
  height: number;
  name?: string;
  baseHeight?: number;
  isDiagonal?: boolean;
  elevation?: {
    nw?: number;
    ne?: number;
    sw?: number;
    se?: number;
  };
}

export interface CreateTerrainTypeParams {
  name: string;
  color?: string;
  icon?: string;
  description?: string;
}

export interface ListParams {
  limit?: number;
}

export interface GenerateLayoutParams {
  sceneDescription: string;
}

export interface GeneratePropsParams {
  prompt: string;
  count?: number;
}

export interface AddGeneratedPropsParams {
  addAll: boolean;
  indices?: number[];
}

export interface DescribeSceneParams {
  context?: string;
}

// Pending terrain configuration (for confirmation flow)
export interface PendingTerrainConfig {
  name: string;
  slug: string;
  color: string;
  icon: string;
  description?: string;
  pieces: { shapeKey: string; shapeName: string; quantity: number }[];
}

export interface SetupTerrainParams {
  name: string;
  pieces?: { shapeKey: string; quantity: number }[];
  color?: string;
  icon?: string;
  description?: string;
}

export interface ConfirmTerrainSetupParams {
  confirm: boolean;
}

export interface AssignPiecesToTerrainParams {
  terrainName: string;
  pieces: { shapeKey: string; quantity: number }[];
}

export interface CreateCustomPieceParams {
  name: string;
  width: number;
  height: number;
  terrainPattern: string[][]; // Grid of terrain slugs/names
  quantity?: number;
}

export interface ListMapsParams {
  limit?: number;
}

export interface GetMapDetailsParams {
  mapName: string;
}
