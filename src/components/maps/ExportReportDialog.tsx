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
import { FileText, FileDown, Download, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import {
  prepareReportData,
  downloadMarkdownReport,
  downloadPDFReport,
  type ReportData,
} from '@/lib/exportReport';
import type { SavedMap, ModularPiece, TerrainType } from '@/types';

interface ExportReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  map: SavedMap;
  availablePieces: ModularPiece[];
  terrainTypes: TerrainType[];
}

type ExportFormat = 'markdown' | 'pdf' | 'both';

export function ExportReportDialog({
  open,
  onOpenChange,
  map,
  availablePieces,
  terrainTypes,
}: ExportReportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prepare report data
  const reportData: ReportData = useMemo(() => {
    return prepareReportData(map, availablePieces, terrainTypes);
  }, [map, availablePieces, terrainTypes]);

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

  const { pieceUsage, totalUsed, totalOverused, totalWithinBudget } = reportData;

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
            <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden">
              <img
                src={map.snapshot}
                alt={map.name}
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Map info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Map:</span>
              <span className="font-medium text-white">{map.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Dimensions:</span>
              <span className="text-white">{map.mapWidth}&quot; x {map.mapHeight}&quot;</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total pieces:</span>
              <span className="text-white">{totalUsed}</span>
            </div>
          </div>

          {/* Status summary */}
          <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
            <div className="text-sm font-medium text-gray-300 mb-2">Piece Status</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-green-900/30 rounded p-2">
                <div className="flex items-center justify-center gap-1 text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-bold">{okCount}</span>
                </div>
                <div className="text-xs text-gray-400">OK</div>
              </div>
              <div className="bg-yellow-900/30 rounded p-2">
                <div className="flex items-center justify-center gap-1 text-yellow-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-bold">{warningCount}</span>
                </div>
                <div className="text-xs text-gray-400">Exact</div>
              </div>
              <div className="bg-red-900/30 rounded p-2">
                <div className="flex items-center justify-center gap-1 text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-bold">{overusedCount}</span>
                </div>
                <div className="text-xs text-gray-400">Over</div>
              </div>
            </div>
            {overusedCount > 0 && (
              <p className="text-xs text-red-400 mt-2">
                {overusedCount} piece type{overusedCount > 1 ? 's' : ''} exceed{overusedCount === 1 ? 's' : ''} available inventory
              </p>
            )}
          </div>

          {/* Format selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Export Format</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setFormat('markdown')}
                className={`p-3 rounded-lg border text-center transition-all ${
                  format === 'markdown'
                    ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                }`}
              >
                <FileText className="h-5 w-5 mx-auto mb-1 text-gray-300" />
                <div className="text-sm font-medium text-white">Markdown</div>
                <div className="text-xs text-gray-400">.md</div>
              </button>
              <button
                onClick={() => setFormat('pdf')}
                className={`p-3 rounded-lg border text-center transition-all ${
                  format === 'pdf'
                    ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                }`}
              >
                <FileDown className="h-5 w-5 mx-auto mb-1 text-gray-300" />
                <div className="text-sm font-medium text-white">PDF</div>
                <div className="text-xs text-gray-400">.pdf</div>
              </button>
              <button
                onClick={() => setFormat('both')}
                className={`p-3 rounded-lg border text-center transition-all ${
                  format === 'both'
                    ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                }`}
              >
                <Download className="h-5 w-5 mx-auto mb-1 text-gray-300" />
                <div className="text-sm font-medium text-white">Both</div>
                <div className="text-xs text-gray-400">.md + .pdf</div>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-sm text-red-400">
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
