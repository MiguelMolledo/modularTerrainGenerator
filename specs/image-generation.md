# Image Generation

FAL.ai integration for transforming map layouts into AI-generated battle map artwork using FLUX models.

## User Capabilities

- Users can open Generate Art dialog from the toolbar
- Users can see their current map as a base for image generation
- Users can provide custom prompts to guide art style
- Users can generate AI prompts from map snapshots automatically
- Users can view generated images in the dialog
- Users can download generated battle map images
- Users can see generation history for current session

## Constraints

- Requires valid FAL.ai API key
- Uses FLUX model for image generation
- Generation is asynchronous with polling for results
- Map snapshot is used as reference for composition
- Image generation costs FAL.ai credits

## Related Specs

- [API Keys](./api-keys.md) - FAL.ai key management
- [Map Designer](./map-designer.md) - provides map snapshot

## Source

- [src/app/api/image/generate/route.ts](../src/app/api/image/generate/route.ts)
- [src/app/api/image/generate-prompt/route.ts](../src/app/api/image/generate-prompt/route.ts)
- [src/lib/falai.ts](../src/lib/falai.ts)
- [src/components/map-designer/GenerateArtDialog.tsx](../src/components/map-designer/GenerateArtDialog.tsx)
