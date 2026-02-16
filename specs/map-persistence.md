# Map Persistence

System for saving, loading, and managing maps in browser localStorage with thumbnail support.

## User Capabilities

- Users can save maps with name and description
- Users can view all saved maps in a library grid
- Users can see auto-generated thumbnails for each map
- Users can upload custom thumbnails for maps
- Users can load any saved map into the designer
- Users can duplicate existing maps
- Users can rename saved maps
- Users can delete saved maps
- Users can see map metadata (dimensions, piece count, last modified)

## Constraints

- All maps stored in browser localStorage (key: `mtc_maps`)
- Thumbnails are optimized to 400x300px maximum
- Map data includes full state snapshot for restoration
- Storage limited by browser localStorage quota (~5-10MB)
- Unsaved changes trigger warning before navigation

## Related Specs

- [Map Designer](./map-designer.md) - editing interface
- [Export System](./export.md) - PDF export of maps

## Source

- [src/store/mapInventoryStore.ts](../src/store/mapInventoryStore.ts)
- [src/lib/thumbnailUtils.ts](../src/lib/thumbnailUtils.ts)
- [src/components/maps/MapCard.tsx](../src/components/maps/MapCard.tsx)
- [src/app/maps/page.tsx](../src/app/maps/page.tsx)
