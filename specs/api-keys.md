# API Keys

Secure management of external API keys for OpenRouter (LLM) and FAL.ai (image generation).

## User Capabilities

- Users can enter their OpenRouter API key in settings
- Users can enter their FAL.ai API key in settings
- Users can test API connections to verify keys work
- Users can see connection status for each service
- Users can clear saved API keys
- Users can update keys at any time

## Security

- Keys are obfuscated before storing in localStorage
- Keys are never exposed in UI after entry
- Connection tests validate keys without exposing them
- Keys sent to API routes for server-side requests

## Services

### OpenRouter
- Powers AI chat assistant
- Used for prop generation
- Used for layout suggestions
- Supports multiple models (Claude, GPT-4, etc.)

### FAL.ai
- Powers image generation
- Uses FLUX model
- Transforms maps into battle map artwork

## Constraints

- Keys stored in browser localStorage only
- Keys required for AI features to function
- Invalid keys show connection error status
- No server-side key storage (client provides keys)

## Related Specs

- [AI Assistant](./ai-assistant.md) - uses OpenRouter
- [Image Generation](./image-generation.md) - uses FAL.ai

## Source

- [src/store/apiKeysStore.ts](../src/store/apiKeysStore.ts)
- [src/app/settings/page.tsx](../src/app/settings/page.tsx)
- [src/app/api/test/openrouter/route.ts](../src/app/api/test/openrouter/route.ts)
- [src/app/api/test/falai/route.ts](../src/app/api/test/falai/route.ts)
