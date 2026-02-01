'use client';

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage, OpenRouterChatMessage, ChatResponse, PendingTerrainConfig } from '@/lib/chat/types';
import { executeToolCalls } from '@/lib/chat/toolExecutor';
import { CHAT_SYSTEM_PROMPT } from '@/lib/chat/systemPrompt';
import { useAPIKeysStore } from './apiKeysStore';
import type { GeneratedProp } from '@/lib/openrouter';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  isOpen: boolean;
  pendingProps: GeneratedProp[];
  pendingTerrain: PendingTerrainConfig | null;

  // Actions
  setOpen: (open: boolean) => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
  setPendingProps: (props: GeneratedProp[]) => void;
  clearPendingProps: () => void;
  setPendingTerrain: (config: PendingTerrainConfig | null) => void;
  clearPendingTerrain: () => void;
}

// Convert our messages to OpenRouter format
function messagesToOpenRouter(messages: ChatMessage[]): OpenRouterChatMessage[] {
  const result: OpenRouterChatMessage[] = [
    { role: 'system', content: CHAT_SYSTEM_PROMPT },
  ];

  for (const msg of messages) {
    if (msg.role === 'user') {
      result.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'assistant') {
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        // Message with tool calls
        result.push({
          role: 'assistant',
          content: msg.content || null,
          tool_calls: msg.toolCalls,
        });

        // Add tool results
        if (msg.toolResults) {
          for (const toolResult of msg.toolResults) {
            result.push({
              role: 'tool',
              tool_call_id: toolResult.toolCallId,
              name: toolResult.name,
              content: JSON.stringify(toolResult.result),
            });
          }
        }
      } else {
        result.push({ role: 'assistant', content: msg.content });
      }
    }
  }

  return result;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,
  isOpen: false,
  pendingProps: [],
  pendingTerrain: null,

  setOpen: (open) => {
    set({ isOpen: open });
  },

  setPendingProps: (props) => {
    set({ pendingProps: props });
  },

  clearPendingProps: () => {
    set({ pendingProps: [] });
  },

  setPendingTerrain: (config) => {
    set({ pendingTerrain: config });
  },

  clearPendingTerrain: () => {
    set({ pendingTerrain: null });
  },

  sendMessage: async (content) => {
    const { messages } = get();

    // Add user message
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    set({
      messages: [...messages, userMessage],
      isLoading: true,
      error: null,
    });

    try {
      // Get API key from store (optional - API will fall back to env)
      const apiKey = useAPIKeysStore.getState().openRouterKey;

      // Build messages for API
      const currentMessages = [...messages, userMessage];
      const openRouterMessages = messagesToOpenRouter(currentMessages);

      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['X-OpenRouter-Key'] = apiKey;
      }

      // Call the API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: openRouterMessages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data: ChatResponse = await response.json();
      const { message, finish_reason } = data;

      // Check if we have tool calls to execute
      if (finish_reason === 'tool_calls' && message.tool_calls && message.tool_calls.length > 0) {
        // Execute tools
        const toolResults = await executeToolCalls(message.tool_calls);

        // Add assistant message with tool calls and results
        const assistantMessage: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: message.content || '',
          toolCalls: message.tool_calls,
          toolResults,
          timestamp: Date.now(),
        };

        set((state) => ({
          messages: [...state.messages, assistantMessage],
        }));

        // Send tool results back to get final response
        const updatedMessages = [...currentMessages, assistantMessage];
        const followUpOpenRouterMessages = messagesToOpenRouter(updatedMessages);

        const followUpResponse = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            messages: followUpOpenRouterMessages,
          }),
        });

        if (!followUpResponse.ok) {
          const errorData = await followUpResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `API error: ${followUpResponse.status}`);
        }

        const followUpData: ChatResponse = await followUpResponse.json();

        // Add final assistant response
        const finalMessage: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: followUpData.message.content || '',
          timestamp: Date.now(),
        };

        set((state) => ({
          messages: [...state.messages, finalMessage],
          isLoading: false,
        }));
      } else {
        // Regular response without tool calls
        const assistantMessage: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: message.content || '',
          timestamp: Date.now(),
        };

        set((state) => ({
          messages: [...state.messages, assistantMessage],
          isLoading: false,
        }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      set({ error: errorMessage, isLoading: false });
    }
  },

  clearMessages: () => {
    set({ messages: [], error: null, pendingProps: [], pendingTerrain: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));
