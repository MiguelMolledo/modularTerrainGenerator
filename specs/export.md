# Export System

PDF report generation for maps including snapshots, piece inventories, magnet requirements, and campaign notes.

## User Capabilities

- Users can export maps as PDF reports
- Users can include map snapshot image in PDF
- Users can include piece inventory list in PDF
- Users can view magnet requirements per piece type in PDF
- Users can add campaign notes to the export
- Users can download the generated PDF file

## PDF Contents

- Map title and description
- Map snapshot (canvas capture)
- Piece inventory by terrain type
- Piece counts and placement summary
- **Magnets table per piece type** with columns:
  - Terrain name
  - Piece name
  - Piece size (dimensions)
  - Quantity used on map
  - Magnets per piece (size and count)
  - Total magnets needed (calculated)
  - Magnet size breakdown (e.g., "16x 3x2")
- Total magnets summary by size
- Magnets grouped by terrain type
- Optional campaign/session notes

## Constraints

- Uses jsPDF library for generation
- PDF generated client-side
- Snapshot quality depends on canvas resolution
- Large maps may produce larger PDF files
- Shapes with magnet data must be available for magnet tables to appear

## Related Specs

- [Map Persistence](./map-persistence.md) - map data source
- [Map Designer](./map-designer.md) - canvas for snapshots
- [Inventory Management](./inventory.md) - shapes with magnet configurations

## Source

- [src/lib/exportReport.ts](../src/lib/exportReport.ts)
- [src/components/maps/ExportReportDialog.tsx](../src/components/maps/ExportReportDialog.tsx)
- [src/app/maps/page.tsx](../src/app/maps/page.tsx) - needs fix to pass shapes
- [src/components/map-designer/Toolbar.tsx](../src/components/map-designer/Toolbar.tsx)
