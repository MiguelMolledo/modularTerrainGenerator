'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// Note: Supabase is no longer used - all data is stored in localStorage
import { useAPIKeysStore, type ConnectionStatus } from '@/store/apiKeysStore';
import {
  Database,
  CheckCircle,
  XCircle,
  ExternalLink,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  Wand2,
  AlertCircle,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  HardDrive,
} from 'lucide-react';
import { downloadAppData, uploadAppData, clearAllData, exportAllData } from '@/lib/localStorage';

// Status indicator component
function StatusIndicator({
  status,
  error,
}: {
  status: ConnectionStatus;
  error: string | null;
}) {
  switch (status) {
    case 'checking':
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
          <span className="text-blue-400">Checking...</span>
        </div>
      );
    case 'connected':
      return (
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="text-green-400">Connected</span>
        </div>
      );
    case 'error':
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-400">Connection failed</span>
          </div>
          {error && (
            <span className="text-xs text-red-400/70 ml-7">{error}</span>
          )}
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-gray-500" />
          <span className="text-gray-400">Not tested</span>
        </div>
      );
  }
}

// API Key input component with show/hide toggle
function APIKeyInput({
  label,
  value,
  onChange,
  placeholder,
  onTest,
  status,
  error,
  isTestingDisabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onTest: () => void;
  status: ConnectionStatus;
  error: string | null;
  isTestingDisabled: boolean;
}) {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        <StatusIndicator status={status} error={error} />
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={showKey ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
          >
            {showKey ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <Button
          variant="outline"
          onClick={onTest}
          disabled={isTestingDisabled || !value}
          className="shrink-0"
        >
          {status === 'checking' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">Test</span>
        </Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const {
    openRouterKey,
    falKey,
    openRouterStatus,
    falStatus,
    openRouterError,
    falError,
    setOpenRouterKey,
    setFalKey,
    testOpenRouterConnection,
    testFalConnection,
    clearKeys,
  } = useAPIKeysStore();

  // Local state for inputs (to avoid storing on every keystroke)
  const [localOpenRouterKey, setLocalOpenRouterKey] = useState('');
  const [localFalKey, setLocalFalKey] = useState('');

  // Calculate storage usage
  const [storageInfo, setStorageInfo] = useState<{ used: string; items: number } | null>(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const data = exportAllData();
        const size = new Blob([JSON.stringify(data)]).size;
        const usedMB = (size / 1024 / 1024).toFixed(2);
        const mapCount = data.maps?.length || 0;
        setStorageInfo({ used: `${usedMB} MB`, items: mapCount });
      } catch {
        setStorageInfo(null);
      }
    }
  }, [importStatus]);

  // Handle export
  const handleExport = () => {
    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      downloadAppData(`modular-terrain-backup-${timestamp}.json`);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle import
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus('idle');
    setImportError(null);

    try {
      await uploadAppData(file, false); // Replace all data
      setImportStatus('success');
      // Refresh page to load new data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      setImportStatus('error');
      setImportError(error instanceof Error ? error.message : 'Failed to import data');
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle clear all data
  const handleClearData = () => {
    if (confirm('Are you sure you want to delete ALL data? This includes all maps, inventory, and settings. This action cannot be undone!')) {
      if (confirm('This is your last chance. Are you REALLY sure?')) {
        clearAllData();
        clearKeys();
        setLocalOpenRouterKey('');
        setLocalFalKey('');
        window.location.reload();
      }
    }
  };

  // Initialize local state from store
  useEffect(() => {
    setLocalOpenRouterKey(openRouterKey);
    setLocalFalKey(falKey);
  }, [openRouterKey, falKey]);

  // Save OpenRouter key
  const handleSaveOpenRouterKey = () => {
    setOpenRouterKey(localOpenRouterKey);
  };

  // Save FAL key
  const handleSaveFalKey = () => {
    setFalKey(localFalKey);
  };

  // Test OpenRouter connection
  const handleTestOpenRouter = async () => {
    // Save first, then test
    if (localOpenRouterKey !== openRouterKey) {
      setOpenRouterKey(localOpenRouterKey);
    }
    await testOpenRouterConnection();
  };

  // Test FAL connection
  const handleTestFal = async () => {
    // Save first, then test
    if (localFalKey !== falKey) {
      setFalKey(localFalKey);
    }
    await testFalConnection();
  };

  // Check if keys have unsaved changes
  const openRouterHasChanges = localOpenRouterKey !== openRouterKey;
  const falHasChanges = localFalKey !== falKey;

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-gray-900 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

        {/* AI Services */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-purple-400" />
              AI Services
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-gray-400">
              Configure your API keys to enable AI-powered features. Keys are stored locally in your browser and are never sent to our servers.
            </p>

            {/* OpenRouter API Key */}
            <div className="p-4 bg-gray-800/50 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span className="font-medium text-white">OpenRouter</span>
                <span className="text-xs text-gray-500">(AI Prop Generation)</span>
              </div>
              <APIKeyInput
                label="API Key"
                value={localOpenRouterKey}
                onChange={setLocalOpenRouterKey}
                placeholder="sk-or-..."
                onTest={handleTestOpenRouter}
                status={openRouterStatus}
                error={openRouterError}
                isTestingDisabled={openRouterStatus === 'checking'}
              />
              {openRouterHasChanges && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-yellow-500">Unsaved changes</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveOpenRouterKey}
                    className="text-xs h-6"
                  >
                    Save
                  </Button>
                </div>
              )}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
              >
                Get an API key <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* FAL.ai API Key */}
            <div className="p-4 bg-gray-800/50 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-amber-400" />
                <span className="font-medium text-white">FAL.ai</span>
                <span className="text-xs text-gray-500">(Generate Art)</span>
              </div>
              <APIKeyInput
                label="API Key"
                value={localFalKey}
                onChange={setLocalFalKey}
                placeholder="fal_..."
                onTest={handleTestFal}
                status={falStatus}
                error={falError}
                isTestingDisabled={falStatus === 'checking'}
              />
              {falHasChanges && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-yellow-500">Unsaved changes</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveFalKey}
                    className="text-xs h-6"
                  >
                    Save
                  </Button>
                </div>
              )}
              <a
                href="https://fal.ai/dashboard/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
              >
                Get an API key <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Clear all keys */}
            {(openRouterKey || falKey) && (
              <div className="pt-2 border-t border-gray-700">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm('Are you sure you want to clear all API keys?')) {
                      clearKeys();
                      setLocalOpenRouterKey('');
                      setLocalFalKey('');
                    }
                  }}
                  className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                >
                  Clear all API keys
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Storage Mode */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5" />
              Storage Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <HardDrive className="h-5 w-5 text-blue-500" />
              <span className="text-blue-400">Local Storage (Browser)</span>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 text-sm">
              <p className="text-gray-300 mb-3">
                All data is stored locally in your browser using LocalStorage. This means:
              </p>
              <ul className="list-disc list-inside text-gray-400 space-y-2">
                <li>Data persists between sessions</li>
                <li>Data is private to your browser</li>
                <li>No account or server required</li>
                <li>Export backups regularly to avoid data loss</li>
              </ul>
              <p className="text-yellow-400/80 mt-4 text-xs">
                Note: Clearing browser data will delete all your maps and settings. Use the Export feature above to create backups.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <HardDrive className="h-5 w-5 text-blue-400" />
              Data Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-gray-400">
              All your data is stored locally in your browser. Export regularly to create backups.
            </p>

            {/* Storage info */}
            {storageInfo && (
              <div className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-lg">
                <div>
                  <span className="text-xs text-gray-500">Storage Used</span>
                  <p className="text-white font-medium">{storageInfo.used}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Maps Saved</span>
                  <p className="text-white font-medium">{storageInfo.items}</p>
                </div>
              </div>
            )}

            {/* Export */}
            <div className="p-4 bg-gray-800/50 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-green-400" />
                <span className="font-medium text-white">Export Data</span>
              </div>
              <p className="text-xs text-gray-400">
                Download all your maps, inventory, and settings as a JSON file.
              </p>
              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export All Data
              </Button>
            </div>

            {/* Import */}
            <div className="p-4 bg-gray-800/50 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-blue-400" />
                <span className="font-medium text-white">Import Data</span>
              </div>
              <p className="text-xs text-gray-400">
                Restore from a previously exported backup. This will replace all current data.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                variant="outline"
              >
                {isImporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Import from File
              </Button>
              {importStatus === 'success' && (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  Import successful! Reloading...
                </div>
              )}
              {importStatus === 'error' && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <XCircle className="h-4 w-4" />
                  {importError || 'Import failed'}
                </div>
              )}
            </div>

            {/* Clear all data */}
            <div className="pt-4 border-t border-gray-700">
              <Button
                variant="ghost"
                onClick={handleClearData}
                className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Data
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Permanently delete all maps, inventory, and settings from this browser.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Map Defaults */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Default Map Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400">Default Width</label>
                <p className="text-white">72 inches</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Default Height</label>
                <p className="text-white">45 inches</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Grid Size</label>
                <p className="text-white">1.5 inches</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Default Levels</label>
                <p className="text-white">B1, Ground, 1, 2</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              These settings are defined in the configuration file and will be customizable in a future update.
            </p>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm">
              Modular Terrain Creator is a tool for designing tabletop terrain layouts.
            </p>
            <div className="mt-4 text-xs text-gray-500">
              <p>Built with Next.js, React, Konva, and Zustand</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
