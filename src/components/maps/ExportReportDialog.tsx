'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { FileText, FileDown, Download, CheckCircle, AlertCircle, AlertTriangle, Magnet, ImageIcon } from 'lucide-react';
import {
  prepareReportData,
  downloadMarkdownReport,
  downloadPDFReport,
  type ReportData,
} from '@/lib/exportReport';
import type { SavedMap, ModularPiece, TerrainType, PieceShape } from '@/types';

interface ExportReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  map: SavedMap;
  availablePieces: ModularPiece[];
  terrainTypes: TerrainType[];
  shapes?: PieceShape[];
}

type ExportFormat = 'markdown' | 'pdf' | 'both';

export function ExportReportDialog({
  open,
  onOpenChange,
  map,
  availablePieces,
  terrainTypes,
  shapes,
}: ExportReportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prepare report data
  const reportData: ReportData = useMemo(() => {
    return prepareReportData(map, availablePieces, terrainTypes, shapes);
  }, [map, availablePieces, terrainTypes, shapes]);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      if (format === 'markdown' || format === 'both') {
        downloadMarkdownReport(reportData);
      }
      if (format === 'pdf' || format === 'both') {
        await downloadPDFReport(reportData);
      }
      onOpenChange(false);
    } catch (err) {
      console.error('Export failed:', err);
      setError(err instanceof Error ? err.message : 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadSnapshot = () => {
    if (!map.snapshot) return;

    const link = document.createElement('a');
    link.href = map.snapshot;
    link.download = `${map.name.replace(/[^a-zA-Z0-9]/g, '_')}_snapshot.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const { pieceUsage, totalUsed, totalOverused, totalWithinBudget, magnetTotals } = reportData;

  // Count status types
  const okCount = pieceUsage.filter(p => p.status === 'ok').length;
  const warningCount = pieceUsage.filter(p => p.status === 'warning').length;
  const overusedCount = pieceUsage.filter(p => p.status === 'overused').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export Map Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Map preview */}
          {map.snapshot && (
            <div className="space-y-2">
              <div className="aspect-video bg-card rounded-lg overflow-hidden">
                <img
                  src={map.snapshot}
                  alt={map.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleDownloadSnapshot}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Download Image
              </Button>
            </div>
          )}

          {/* Map info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Map:</span>
              <span className="font-medium text-foreground">{map.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Dimensions:</span>
              <span className="text-foreground">{map.mapWidth}&quot; x {map.mapHeight}&quot;</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total pieces:</span>
              <span className="text-foreground">{totalUsed}</span>
            </div>
          </div>

          {/* Status summary */}
          <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
            <div className="text-sm font-medium text-foreground mb-2">Piece Status</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-green-900/30 rounded p-2">
                <div className="flex items-center justify-center gap-1 text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-bold">{okCount}</span>
                </div>
                <div className="text-xs text-muted-foreground">OK</div>
              </div>
              <div className="bg-yellow-900/30 rounded p-2">
                <div className="flex items-center justify-center gap-1 text-yellow-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-bold">{warningCount}</span>
                </div>
                <div className="text-xs text-muted-foreground">Exact</div>
              </div>
              <div className="bg-red-900/30 rounded p-2">
                <div className="flex items-center justify-center gap-1 text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-bold">{overusedCount}</span>
                </div>
                <div className="text-xs text-muted-foreground">Over</div>
              </div>
            </div>
            {overusedCount > 0 && (
              <p className="text-xs text-destructive mt-2">
                {overusedCount} piece type{overusedCount > 1 ? 's' : ''} exceed{overusedCount === 1 ? 's' : ''} available inventory
              </p>
            )}
          </div>

          {/* Magnets summary (if any) */}
          {magnetTotals.length > 0 && (
            <div className="bg-purple-900/30 rounded-lg p-3 space-y-2">
              <div className="text-sm font-medium text-purple-300 flex items-center gap-2">
                <Magnet className="h-4 w-4" />
                Magnets Needed
              </div>
              <div className="flex flex-wrap gap-2">
                {magnetTotals.map((magnet) => (
                  <div
                    key={magnet.size}
                    className="bg-purple-800/40 px-2 py-1 rounded text-xs"
                  >
                    <span className="text-purple-300">{magnet.size}:</span>
                    <span className="text-foreground ml-1 font-bold">{magnet.totalNeeded}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Format selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Export Format</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setFormat('markdown')}
                className={`p-3 rounded-lg border text-center transition-all ${
                  format === 'markdown'
                    ? 'bg-primary/20 border-primary ring-1 ring-primary'
                    : 'bg-card border-border hover:border-border'
                }`}
              >
                <FileText className="h-5 w-5 mx-auto mb-1 text-foreground" />
                <div className="text-sm font-medium text-foreground">Markdown</div>
                <div className="text-xs text-muted-foreground">.md</div>
              </button>
              <button
                onClick={() => setFormat('pdf')}
                className={`p-3 rounded-lg border text-center transition-all ${
                  format === 'pdf'
                    ? 'bg-primary/20 border-primary ring-1 ring-primary'
                    : 'bg-card border-border hover:border-border'
                }`}
              >
                <FileDown className="h-5 w-5 mx-auto mb-1 text-foreground" />
                <div className="text-sm font-medium text-foreground">PDF</div>
                <div className="text-xs text-muted-foreground">.pdf</div>
              </button>
              <button
                onClick={() => setFormat('both')}
                className={`p-3 rounded-lg border text-center transition-all ${
                  format === 'both'
                    ? 'bg-primary/20 border-primary ring-1 ring-primary'
                    : 'bg-card border-border hover:border-border'
                }`}
              >
                <Download className="h-5 w-5 mx-auto mb-1 text-foreground" />
                <div className="text-sm font-medium text-foreground">Both</div>
                <div className="text-xs text-muted-foreground">.md + .pdf</div>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/20 border border-destructive rounded-lg p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
