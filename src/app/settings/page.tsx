'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Database, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

export default function SettingsPage() {
  const supabaseConfigured = isSupabaseConfigured();

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-gray-900 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

        {/* Supabase Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5" />
              Cloud Storage (Supabase)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              {supabaseConfigured ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-green-400">Connected</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-red-400">Not configured</span>
                </>
              )}
            </div>

            {!supabaseConfigured && (
              <div className="bg-gray-800 rounded-lg p-4 text-sm">
                <p className="text-gray-300 mb-3">
                  To enable cloud storage, you need to configure Supabase:
                </p>
                <ol className="list-decimal list-inside text-gray-400 space-y-2">
                  <li>Create a free account at supabase.com</li>
                  <li>Create a new project</li>
                  <li>Copy your Project URL and anon key</li>
                  <li>Add them to <code className="bg-gray-700 px-1 rounded">.env.local</code></li>
                  <li>Restart the development server</li>
                </ol>
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 mt-4"
                >
                  Go to Supabase <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}
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
