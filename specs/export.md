# Export System

PDF report generation for maps including snapshots, piece inventories, and campaign notes.

## User Capabilities

- Users can export maps as PDF reports
- Users can include map snapshot image in PDF
- Users can include piece inventory list in PDF
- Users can add campaign notes to the export
- Users can download the generated PDF file

## PDF Contents

- Map title and description
- Map snapshot (canvas capture)
- Piece inventory by terrain type
- Piece counts and placement summary
- Optional campaign/session notes

## Constraints

- Uses jsPDF library for generation
- PDF generated client-side
- Snapshot quality depends on canvas resolution
- Large maps may produce larger PDF files

## Related Specs

- [Map Persistence](./map-persistence.md) - map data source
- [Map Designer](./map-designer.md) - canvas for snapshots

## Source

- [src/lib/exportReport.ts](../src/lib/exportReport.ts)
- [src/components/maps/ExportReportDialog.tsx](../src/components/maps/ExportReportDialog.tsx)
