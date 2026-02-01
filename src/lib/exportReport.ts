import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SavedMap, ModularPiece, TerrainType, PlacedPiece, PieceShape } from '@/types';

export interface PieceUsage {
  pieceId: string;
  name: string;
  terrainName: string;
  terrainIcon: string;
  terrainColor: string;
  sizeLabel: string;
  used: number;
  available: number;
  remaining: number;
  status: 'ok' | 'warning' | 'overused';
  // Magnets for this piece type (size -> quantity per piece)
  magnetsPerPiece?: { size: string; quantity: number }[];
}

// Magnet usage by size
export interface MagnetUsage {
  size: string;
  totalNeeded: number;
}

// Magnet usage grouped by terrain
export interface MagnetsByTerrain {
  terrainName: string;
  terrainIcon: string;
  magnets: MagnetUsage[];
}

export interface ReportData {
  map: SavedMap;
  pieceUsage: PieceUsage[];
  totalUsed: number;
  totalOverused: number;
  totalWithinBudget: number;
  // Magnet totals
  magnetTotals: MagnetUsage[];
  magnetsByTerrain: MagnetsByTerrain[];
}

/**
 * Calculate piece usage from placed pieces and available inventory
 */
export function calculatePieceUsage(
  placedPieces: PlacedPiece[],
  availablePieces: ModularPiece[],
  terrainTypes: TerrainType[],
  shapes?: PieceShape[]
): PieceUsage[] {
  // Count how many of each piece is used
  const usageCount = new Map<string, number>();

  for (const placed of placedPieces) {
    const count = usageCount.get(placed.pieceId) || 0;
    usageCount.set(placed.pieceId, count + 1);
  }

  // Build usage report for all pieces that have been used
  const usageList: PieceUsage[] = [];

  for (const [pieceId, used] of usageCount.entries()) {
    const piece = availablePieces.find(p => p.id === pieceId);
    if (!piece) continue;

    const terrain = terrainTypes.find(t =>
      t.id === piece.terrainTypeId || t.slug === piece.terrainTypeId
    );

    const available = piece.quantity;
    const remaining = available - used;

    let status: 'ok' | 'warning' | 'overused' = 'ok';
    if (remaining < 0) {
      status = 'overused';
    } else if (remaining === 0) {
      status = 'warning';
    }

    // Look up magnets from shape if shapes are provided
    // The pieceId format is typically "terrain-shapeKey" or "custom-xxx" or "variant-xxx"
    let magnetsPerPiece: { size: string; quantity: number }[] | undefined;
    if (shapes && shapes.length > 0) {
      // Try multiple strategies to find the matching shape:
      // 1. Direct shapeKey match (try all possible splits since terrain slug may have hyphens)
      // 2. Match by dimensions from piece size
      const parts = pieceId.split('-');
      let foundShape: PieceShape | undefined;

      // Strategy 1: Try different split points for "terrain-shapeKey" format
      // e.g., "dark-forest-6x6-flat" could be "dark-forest" + "6x6-flat" or "dark" + "forest-6x6-flat"
      for (let splitIdx = 1; splitIdx < parts.length && !foundShape; splitIdx++) {
        const potentialShapeKey = parts.slice(splitIdx).join('-');
        foundShape = shapes.find(s => s.shapeKey === potentialShapeKey);
      }

      // Strategy 2: If not found, try matching by piece dimensions
      if (!foundShape && piece) {
        const pieceWidth = piece.size.width;
        const pieceHeight = piece.size.height;
        const isDiag = piece.isDiagonal;
        // Find a shape with matching dimensions and diagonal flag
        foundShape = shapes.find(s =>
          s.width === pieceWidth &&
          s.height === pieceHeight &&
          s.isDiagonal === isDiag
        );
      }

      if (foundShape?.magnets && foundShape.magnets.length > 0) {
        magnetsPerPiece = foundShape.magnets.map(m => ({ size: m.size, quantity: m.quantity }));
      }
    }

    usageList.push({
      pieceId,
      name: piece.name,
      terrainName: terrain?.name || 'Unknown',
      terrainIcon: terrain?.icon || '?',
      terrainColor: terrain?.color || '#888888',
      sizeLabel: piece.size.label,
      used,
      available,
      remaining,
      status,
      magnetsPerPiece,
    });
  }

  // Sort by terrain, then by name
  usageList.sort((a, b) => {
    if (a.terrainName !== b.terrainName) {
      return a.terrainName.localeCompare(b.terrainName);
    }
    return a.name.localeCompare(b.name);
  });

  return usageList;
}

/**
 * Prepare report data for export
 */
export function prepareReportData(
  map: SavedMap,
  availablePieces: ModularPiece[],
  terrainTypes: TerrainType[],
  shapes?: PieceShape[]
): ReportData {
  const pieceUsage = calculatePieceUsage(map.placedPieces, availablePieces, terrainTypes, shapes);

  const totalUsed = pieceUsage.reduce((sum, p) => sum + p.used, 0);
  const totalOverused = pieceUsage.filter(p => p.status === 'overused').length;
  const totalWithinBudget = pieceUsage.filter(p => p.status !== 'overused').length;

  // Calculate magnet totals
  const magnetTotalsMap = new Map<string, number>();
  const magnetsByTerrainMap = new Map<string, { terrainIcon: string; magnets: Map<string, number> }>();

  for (const piece of pieceUsage) {
    if (piece.magnetsPerPiece && piece.magnetsPerPiece.length > 0) {
      // Get or create terrain entry
      const terrainKey = piece.terrainName;
      if (!magnetsByTerrainMap.has(terrainKey)) {
        magnetsByTerrainMap.set(terrainKey, {
          terrainIcon: piece.terrainIcon,
          magnets: new Map(),
        });
      }
      const terrainEntry = magnetsByTerrainMap.get(terrainKey)!;

      for (const magnet of piece.magnetsPerPiece) {
        const totalForPiece = magnet.quantity * piece.used;

        // Add to overall totals
        const currentTotal = magnetTotalsMap.get(magnet.size) || 0;
        magnetTotalsMap.set(magnet.size, currentTotal + totalForPiece);

        // Add to terrain-specific totals
        const terrainMagnetTotal = terrainEntry.magnets.get(magnet.size) || 0;
        terrainEntry.magnets.set(magnet.size, terrainMagnetTotal + totalForPiece);
      }
    }
  }

  // Convert maps to arrays
  const magnetTotals: MagnetUsage[] = Array.from(magnetTotalsMap.entries())
    .map(([size, totalNeeded]) => ({ size, totalNeeded }))
    .sort((a, b) => a.size.localeCompare(b.size));

  const magnetsByTerrain: MagnetsByTerrain[] = Array.from(magnetsByTerrainMap.entries())
    .map(([terrainName, data]) => ({
      terrainName,
      terrainIcon: data.terrainIcon,
      magnets: Array.from(data.magnets.entries())
        .map(([size, totalNeeded]) => ({ size, totalNeeded }))
        .sort((a, b) => a.size.localeCompare(b.size)),
    }))
    .sort((a, b) => a.terrainName.localeCompare(b.terrainName));

  return {
    map,
    pieceUsage,
    totalUsed,
    totalOverused,
    totalWithinBudget,
    magnetTotals,
    magnetsByTerrain,
  };
}

/**
 * Get status emoji for display
 */
function getStatusEmoji(status: 'ok' | 'warning' | 'overused'): string {
  switch (status) {
    case 'ok': return '✅';
    case 'warning': return '⚠️';
    case 'overused': return '❌';
  }
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Generate Markdown report
 */
export function generateMarkdownReport(data: ReportData): string {
  const { map, pieceUsage, totalUsed, totalOverused, totalWithinBudget, magnetTotals, magnetsByTerrain } = data;

  let md = '';

  // Header
  md += `# Map Report: ${map.name}\n\n`;

  // Snapshot image (if available)
  if (map.snapshot) {
    md += `![Map Preview](${map.snapshot})\n\n`;
  }

  // Map info
  if (map.description) {
    md += `**Description:** ${map.description}\n\n`;
  }
  md += `**Dimensions:** ${map.mapWidth}" x ${map.mapHeight}"\n\n`;
  md += `**Levels:** ${map.levels.map(l => l === 0 ? 'Ground' : l < 0 ? `Basement ${Math.abs(l)}` : `Floor ${l}`).join(', ')}\n\n`;
  md += `**Total Pieces Used:** ${totalUsed}\n\n`;
  md += `**Exported:** ${formatDate(new Date().toISOString())}\n\n`;

  md += '---\n\n';

  // Pieces Summary Table
  md += '## Pieces Summary\n\n';
  md += '| Terrain | Piece | Size | Used | Available | Remaining | Status |\n';
  md += '|---------|-------|------|------|-----------|-----------|--------|\n';

  for (const piece of pieceUsage) {
    const remaining = piece.remaining >= 0 ? piece.remaining : piece.remaining;
    md += `| ${piece.terrainIcon} ${piece.terrainName} | ${piece.name} | ${piece.sizeLabel} | ${piece.used} | ${piece.available} | ${remaining} | ${getStatusEmoji(piece.status)} |\n`;
  }

  md += '\n';

  // Totals
  md += '### Totals\n\n';
  md += `- **Total pieces used:** ${totalUsed}\n`;
  md += `- **Piece types within budget:** ${totalWithinBudget} ${totalWithinBudget > 0 ? '✅' : ''}\n`;
  if (totalOverused > 0) {
    md += `- **Piece types overused:** ${totalOverused} ❌\n`;
  }

  md += '\n---\n\n';

  // Magnets Summary (if any magnets needed)
  if (magnetTotals.length > 0) {
    md += '## 🧲 Magnets Needed\n\n';

    // Total magnets table
    md += '### Total Magnets Summary\n\n';
    md += '| Magnet Size | Quantity Needed |\n';
    md += '|-------------|----------------|\n';
    for (const magnet of magnetTotals) {
      md += `| ${magnet.size} | ${magnet.totalNeeded} |\n`;
    }
    md += '\n';

    // Magnets per piece type
    const piecesWithMagnets = pieceUsage.filter(p => p.magnetsPerPiece && p.magnetsPerPiece.length > 0);
    if (piecesWithMagnets.length > 0) {
      md += '### Magnets by Piece Type\n\n';
      md += '| Terrain | Piece | Size | Qty Used | Magnets/Piece | Total Magnets |\n';
      md += '|---------|-------|------|----------|---------------|---------------|\n';

      for (const piece of piecesWithMagnets) {
        const magnetsStr = piece.magnetsPerPiece!.map(m => `${m.quantity}x ${m.size}`).join(', ');
        const totalMagnets = piece.magnetsPerPiece!.map(m => {
          const total = m.quantity * piece.used;
          return `${total}x ${m.size}`;
        }).join(', ');

        md += `| ${piece.terrainIcon} ${piece.terrainName} | ${piece.name} | ${piece.sizeLabel} | ${piece.used} | ${magnetsStr} | ${totalMagnets} |\n`;
      }
      md += '\n';
    }

    // Magnets by terrain
    if (magnetsByTerrain.length > 0) {
      md += '### Magnets by Terrain\n\n';
      for (const terrain of magnetsByTerrain) {
        md += `#### ${terrain.terrainIcon} ${terrain.terrainName}\n\n`;
        for (const magnet of terrain.magnets) {
          md += `- **${magnet.size}**: ${magnet.totalNeeded} magnets\n`;
        }
        md += '\n';
      }
    }

    md += '---\n\n';
  }

  // Pieces grouped by terrain
  md += '## Pieces by Terrain\n\n';

  // Group by terrain
  const byTerrain = new Map<string, PieceUsage[]>();
  for (const piece of pieceUsage) {
    const key = `${piece.terrainIcon} ${piece.terrainName}`;
    if (!byTerrain.has(key)) {
      byTerrain.set(key, []);
    }
    byTerrain.get(key)!.push(piece);
  }

  for (const [terrainKey, pieces] of byTerrain.entries()) {
    md += `### ${terrainKey}\n\n`;
    for (const piece of pieces) {
      const statusMark = piece.status === 'overused' ? ' ❌' : piece.status === 'warning' ? ' ⚠️' : '';
      md += `- ${piece.name} (${piece.sizeLabel}): ${piece.used} used / ${piece.available} available${statusMark}\n`;
    }
    md += '\n';
  }

  md += '---\n\n';
  md += '*Generated with Modular Terrain Creator*\n';

  return md;
}

/**
 * Generate PDF report
 */
export async function generatePDFReport(data: ReportData): Promise<Blob> {
  const { map, pieceUsage, totalUsed, totalOverused, totalWithinBudget, magnetTotals, magnetsByTerrain } = data;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(`Map Report: ${map.name}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Snapshot image (if available) - full width for better visibility
  if (map.snapshot) {
    try {
      // Use almost full page width with margins
      const margin = 15;
      const imgWidth = pageWidth - (margin * 2);
      // Calculate height maintaining aspect ratio (assuming 16:9 or similar)
      const imgHeight = imgWidth * 0.625; // 10:16 ratio for landscape maps
      doc.addImage(map.snapshot, 'JPEG', margin, yPos, imgWidth, imgHeight);
      yPos += imgHeight + 10;
    } catch {
      // Image failed to load, skip it
    }
  }

  // Map info section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  if (map.description) {
    doc.text(`Description: ${map.description}`, 20, yPos);
    yPos += 6;
  }

  doc.text(`Dimensions: ${map.mapWidth}" x ${map.mapHeight}"`, 20, yPos);
  yPos += 6;

  const levelNames = map.levels.map(l => l === 0 ? 'Ground' : l < 0 ? `Basement ${Math.abs(l)}` : `Floor ${l}`);
  doc.text(`Levels: ${levelNames.join(', ')}`, 20, yPos);
  yPos += 6;

  doc.text(`Total Pieces Used: ${totalUsed}`, 20, yPos);
  yPos += 6;

  doc.text(`Exported: ${formatDate(new Date().toISOString())}`, 20, yPos);
  yPos += 15;

  // Summary stats
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 20, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Piece types within budget: ${totalWithinBudget}`, 25, yPos);
  yPos += 5;

  if (totalOverused > 0) {
    doc.setTextColor(200, 0, 0);
    doc.text(`Piece types overused: ${totalOverused}`, 25, yPos);
    doc.setTextColor(0, 0, 0);
  }
  yPos += 10;

  // Pieces table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Pieces Summary', 20, yPos);
  yPos += 5;

  const tableData = pieceUsage.map(piece => {
    const statusText = piece.status === 'overused' ? 'OVER' : piece.status === 'warning' ? 'EXACT' : 'OK';
    return [
      piece.terrainName, // Remove emoji - PDFs don't support them well
      piece.name,
      piece.sizeLabel,
      piece.used.toString(),
      piece.available.toString(),
      piece.remaining.toString(),
      statusText,
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Terrain', 'Piece', 'Size', 'Used', 'Avail.', 'Remain.', 'Status']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [60, 60, 60],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 40 },
      2: { cellWidth: 20 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 18, halign: 'center' },
    },
    didParseCell: (data) => {
      // Color the status column
      if (data.column.index === 6 && data.section === 'body') {
        const status = data.cell.raw as string;
        if (status === 'OVER') {
          data.cell.styles.textColor = [200, 0, 0];
          data.cell.styles.fontStyle = 'bold';
        } else if (status === 'EXACT') {
          data.cell.styles.textColor = [180, 140, 0];
        } else {
          data.cell.styles.textColor = [0, 150, 0];
        }
      }
      // Color remaining column based on value
      if (data.column.index === 5 && data.section === 'body') {
        const remaining = parseInt(data.cell.raw as string, 10);
        if (remaining < 0) {
          data.cell.styles.textColor = [200, 0, 0];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let currentY = (doc as any).lastAutoTable?.finalY || yPos + 50;

  // Magnets section (if any magnets needed)
  if (magnetTotals.length > 0) {
    currentY += 15;

    // Check if we need a new page
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Magnets Needed', 20, currentY);
    currentY += 8;

    // Total magnets table
    const magnetTableData = magnetTotals.map(m => [m.size, m.totalNeeded.toString()]);

    autoTable(doc, {
      startY: currentY,
      head: [['Magnet Size', 'Quantity Needed']],
      body: magnetTableData,
      theme: 'striped',
      headStyles: {
        fillColor: [80, 80, 120],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 40, halign: 'center' },
      },
      tableWidth: 'auto',
      margin: { left: 20 },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentY = (doc as any).lastAutoTable?.finalY || currentY + 30;

    // Magnets per piece type
    const piecesWithMagnets = pieceUsage.filter(p => p.magnetsPerPiece && p.magnetsPerPiece.length > 0);
    if (piecesWithMagnets.length > 0) {
      currentY += 10;

      // Check if we need a new page
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Magnets by Piece Type', 20, currentY);
      currentY += 8;

      const piecesMagnetData: string[][] = [];
      for (const piece of piecesWithMagnets) {
        const magnetsStr = piece.magnetsPerPiece!.map(m => `${m.quantity}x ${m.size}`).join(', ');
        const totalMagnets = piece.magnetsPerPiece!.map(m => {
          const total = m.quantity * piece.used;
          return `${total}x ${m.size}`;
        }).join(', ');

        piecesMagnetData.push([
          piece.terrainName,
          piece.name,
          piece.sizeLabel,
          piece.used.toString(),
          magnetsStr,
          totalMagnets,
        ]);
      }

      autoTable(doc, {
        startY: currentY,
        head: [['Terrain', 'Piece', 'Size', 'Qty', 'Magnets/Piece', 'Total Magnets']],
        body: piecesMagnetData,
        theme: 'striped',
        headStyles: {
          fillColor: [100, 80, 120],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
        },
        bodyStyles: {
          fontSize: 7,
        },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 32 },
          2: { cellWidth: 18 },
          3: { cellWidth: 12, halign: 'center' },
          4: { cellWidth: 35 },
          5: { cellWidth: 35 },
        },
        tableWidth: 'auto',
        margin: { left: 20 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentY = (doc as any).lastAutoTable?.finalY || currentY + 30;
    }

    // Magnets by terrain (if multiple terrains)
    if (magnetsByTerrain.length > 1) {
      currentY += 10;

      // Check if we need a new page
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Magnets by Terrain Type', 20, currentY);
      currentY += 8;

      const terrainMagnetData: string[][] = [];
      for (const terrain of magnetsByTerrain) {
        for (const magnet of terrain.magnets) {
          terrainMagnetData.push([terrain.terrainName, magnet.size, magnet.totalNeeded.toString()]);
        }
      }

      autoTable(doc, {
        startY: currentY,
        head: [['Terrain', 'Magnet Size', 'Quantity']],
        body: terrainMagnetData,
        theme: 'striped',
        headStyles: {
          fillColor: [80, 100, 80],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8,
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 35 },
          2: { cellWidth: 30, halign: 'center' },
        },
        tableWidth: 'auto',
        margin: { left: 20 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentY = (doc as any).lastAutoTable?.finalY || currentY + 30;
    }
  }

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(128, 128, 128);
  doc.text('Generated with Modular Terrain Creator', pageWidth / 2, currentY + 15, { align: 'center' });

  return doc.output('blob');
}

/**
 * Download a file
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download Markdown report
 */
export function downloadMarkdownReport(data: ReportData): void {
  const markdown = generateMarkdownReport(data);
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const filename = `${data.map.name.replace(/[^a-zA-Z0-9]/g, '_')}_report.md`;
  downloadFile(blob, filename);
}

/**
 * Download PDF report
 */
export async function downloadPDFReport(data: ReportData): Promise<void> {
  const blob = await generatePDFReport(data);
  const filename = `${data.map.name.replace(/[^a-zA-Z0-9]/g, '_')}_report.pdf`;
  downloadFile(blob, filename);
}
