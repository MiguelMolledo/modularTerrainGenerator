# AI Assistant

OpenRouter-powered chat interface with tool support for terrain creation, prop generation, and layout suggestions.

## User Capabilities

### Chat Interface
- Users can open AI assistant dialog from the toolbar
- Users can have natural language conversations about map creation
- Users can ask for help with terrain setup and piece placement
- Users can see AI responses with formatted text

### Tool-Powered Actions
- Users can ask AI to create new terrain types
- Users can ask AI to create new piece shapes
- Users can ask AI to set up terrain with appropriate pieces
- Users can ask AI to generate prop suggestions
- Users can ask AI to suggest map layouts based on scene descriptions
- Users can review and confirm AI-generated changes before applying

### Specialized Dialogs
- Users can use AI Layout Dialog to get placement suggestions
- Users can use AI Props Dialog to generate props for scenes
- Users can use Scene Description Dialog to generate battle map descriptions
- Users can use Campaign Analyzer to analyze campaign context

## Constraints

- Requires valid OpenRouter API key
- AI suggestions require user confirmation before applying
- Tool calls are executed against inventory and map stores
- Supported models: Claude 3.5 Sonnet, GPT-4o-mini, Haiku

## Related Specs

- [API Keys](./api-keys.md) - OpenRouter key management
- [Inventory Management](./inventory.md) - AI can create terrains/pieces
- [Map Designer](./map-designer.md) - AI can suggest placements

## Source

- [src/store/chatStore.ts](../src/store/chatStore.ts)
- [src/lib/chat/tools.ts](../src/lib/chat/tools.ts)
- [src/lib/chat/toolExecutor.ts](../src/lib/chat/toolExecutor.ts)
- [src/lib/openrouter.ts](../src/lib/openrouter.ts)
- [src/app/api/chat/route.ts](../src/app/api/chat/route.ts)
- [src/app/api/llm/suggest-layout/route.ts](../src/app/api/llm/suggest-layout/route.ts)
- [src/app/api/llm/generate-props/route.ts](../src/app/api/llm/generate-props/route.ts)
- [src/components/chat/AIChatDialog.tsx](../src/components/chat/AIChatDialog.tsx)
- [src/components/map-designer/AILayoutDialog.tsx](../src/components/map-designer/AILayoutDialog.tsx)
- [src/components/map-designer/AIPropsDialog.tsx](../src/components/map-designer/AIPropsDialog.tsx)
