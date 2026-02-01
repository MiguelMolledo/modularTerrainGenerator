'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useChatStore } from '@/store/chatStore';
import { Send, Loader2, Trash2, AlertCircle, CheckCircle, XCircle, Sparkles, Copy, Check, X, Minimize2 } from 'lucide-react';

export function AIChatDialog() {
  const [input, setInput] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, isLoading, error, isOpen, setOpen, sendMessage, clearMessages, clearError } = useChatStore();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Format tool result for display
  const formatToolResult = (result: unknown, name: string): React.ReactNode => {
    if (!result) return null;

    const r = result as Record<string, unknown>;

    // Special formatting for setup_terrain (pending confirmation)
    if (name === 'setup_terrain' && r.pending && r.terrain) {
      const terrain = r.terrain as { name: string; slug: string; color: string; icon: string; description?: string; pieces: { shapeKey: string; shapeName: string; quantity: number }[] };
      return (
        <div className="mt-2 space-y-2">
          <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{terrain.icon}</span>
              <span className="font-medium text-white">{terrain.name}</span>
              <span
                className="w-4 h-4 rounded-full border border-white/30"
                style={{ backgroundColor: terrain.color }}
              />
            </div>
            {terrain.description && (
              <p className="text-xs text-gray-400 mb-2">{terrain.description}</p>
            )}
            {terrain.pieces.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs text-amber-400">Pieces:</span>
                <div className="grid grid-cols-2 gap-1">
                  {terrain.pieces.map((piece, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-800 px-2 py-1 rounded text-xs">
                      <span className="text-gray-300">{piece.shapeName}</span>
                      <span className="text-amber-400">x{piece.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-amber-300 mt-2">
              Say &quot;confirm&quot; to create or &quot;cancel&quot; to discard.
            </p>
          </div>
        </div>
      );
    }

    // Special formatting for confirm_terrain_setup
    if (name === 'confirm_terrain_setup') {
      if (r.cancelled) {
        return (
          <div className="mt-2 text-sm text-gray-400">
            Configuration cancelled.
          </div>
        );
      }
      if (r.terrain) {
        const terrain = r.terrain as { name: string; icon: string; color: string };
        const shapesCreated = (r.shapesCreated as string[]) || [];
        return (
          <div className="mt-2 text-sm">
            <div className="flex items-center gap-2 text-green-400">
              <span className="text-lg">{terrain.icon}</span>
              <span>Terrain &quot;{terrain.name}&quot; created</span>
            </div>
            {Number(r.piecesAssigned) > 0 && (
              <p className="text-gray-400 text-xs mt-1">{Number(r.piecesAssigned)} piece types assigned</p>
            )}
            {shapesCreated.length > 0 && (
              <p className="text-gray-400 text-xs">Shapes created: {shapesCreated.join(', ')}</p>
            )}
          </div>
        );
      }
    }

    // Special formatting for assign_pieces_to_terrain
    if (name === 'assign_pieces_to_terrain' && r.assignedPieces) {
      const assigned = r.assignedPieces as { shape: string; quantity: number }[];
      const missing = r.missingShapes as string[] | undefined;
      return (
        <div className="mt-2 text-sm">
          <div className="text-green-400">Pieces assigned to {String(r.terrain)}:</div>
          <div className="flex flex-wrap gap-1 mt-1">
            {assigned.map((p, i) => (
              <span key={i} className="bg-green-900/50 px-2 py-0.5 rounded text-xs text-green-300">
                {p.shape} x{p.quantity}
              </span>
            ))}
          </div>
          {missing && missing.length > 0 && (
            <p className="text-amber-400 text-xs mt-1">Shapes not found: {missing.join(', ')}</p>
          )}
        </div>
      );
    }

    // Special formatting for create_custom_piece
    if (name === 'create_custom_piece' && r.id) {
      return (
        <div className="mt-2 text-sm text-green-400">
          Custom piece &quot;{String(r.name)}&quot; created ({String(r.dimensions)}) x{Number(r.quantity)}
        </div>
      );
    }

    // Special formatting for list_maps
    if (name === 'list_maps' && r.maps) {
      const maps = r.maps as Array<{ id: string; name: string; dimensions: string; piecesCount: number }>;
      return (
        <div className="mt-2 text-sm">
          <span className="text-blue-400">{Number(r.count)} maps found:</span>
          <div className="space-y-1 mt-2">
            {maps.slice(0, 8).map((map) => (
              <div key={map.id} className="flex items-center justify-between bg-gray-800 px-2 py-1 rounded text-xs">
                <span className="text-white">🗺️ {map.name}</span>
                <span className="text-gray-400">{map.dimensions} • {map.piecesCount} pieces</span>
              </div>
            ))}
            {maps.length > 8 && <span className="text-gray-500 text-xs">+{maps.length - 8} more</span>}
          </div>
        </div>
      );
    }

    // Special formatting for get_map_details
    if (name === 'get_map_details' && r.name) {
      const terrains = (r.terrains as Array<{ name: string; icon: string; pieces: number }>) || [];
      const props = (r.props as Array<{ name: string; emoji: string; count: number }>) || [];
      return (
        <div className="mt-2 text-sm">
          <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🗺️</span>
              <span className="font-medium text-white">{String(r.name)}</span>
            </div>
            <div className="text-xs text-gray-400 mb-2">
              {String(r.dimensions)} ({String(r.dimensionsFeet)}) • {Number(r.totalPieces)} pieces
            </div>
            {terrains.length > 0 && (
              <div className="mb-2">
                <span className="text-xs text-blue-400">Terrains:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {terrains.map((t, i) => (
                    <span key={i} className="bg-gray-800 px-2 py-0.5 rounded text-xs">
                      {t.icon} {t.name} x{t.pieces}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {props.length > 0 && (
              <div>
                <span className="text-xs text-blue-400">Props:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {props.slice(0, 6).map((p, i) => (
                    <span key={i} className="bg-gray-800 px-2 py-0.5 rounded text-xs">
                      {p.emoji} {p.name} x{p.count}
                    </span>
                  ))}
                  {props.length > 6 && <span className="text-gray-500 text-xs">+{props.length - 6} more</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Special formatting for describe_scene
    if (name === 'describe_scene' && r.readAloud) {
      const readAloud = String(r.readAloud);
      const dmNotes = r.dmNotes ? String(r.dmNotes) : null;
      return (
        <div className="space-y-3 mt-2">
          <div className="bg-indigo-900/30 border border-indigo-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-indigo-400">Read Aloud</span>
              <button
                onClick={() => handleCopy(readAloud)}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
              >
                {copiedText === readAloud ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copiedText === readAloud ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-sm text-gray-200 italic whitespace-pre-wrap">{readAloud}</p>
          </div>
          {dmNotes && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-400">DM Notes</span>
                <button
                  onClick={() => handleCopy(dmNotes)}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                >
                  {copiedText === dmNotes ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedText === dmNotes ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{dmNotes}</p>
            </div>
          )}
        </div>
      );
    }

    // Format for generate_props (pending confirmation)
    if (name === 'generate_props' && r.props) {
      const props = r.props as Array<{ index: number; emoji: string; name: string; category: string; size: string }>;
      const count = Number(r.count) || props.length;
      return (
        <div className="mt-2 text-sm">
          <span className="text-yellow-400">{count} props generated:</span>
          <div className="grid grid-cols-1 gap-1 mt-2">
            {props.map((prop) => (
              <div key={prop.index} className="flex items-center gap-2 bg-gray-800 px-2 py-1.5 rounded text-xs">
                <span className="text-gray-500">{prop.index + 1}.</span>
                <span className="text-lg">{prop.emoji}</span>
                <span className="text-white">{prop.name}</span>
                <span className="text-gray-500 ml-auto">{prop.category}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Format for add_generated_props (confirmed)
    if (name === 'add_generated_props' && r.props) {
      const props = r.props as string[];
      const count = Number(r.addedCount) || props.length;
      return (
        <div className="mt-2 text-sm">
          <span className="text-green-400">{count} props added:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {props.slice(0, 10).map((prop, i) => (
              <span key={i} className="bg-green-900/50 px-2 py-0.5 rounded text-xs text-green-300">{prop}</span>
            ))}
            {props.length > 10 && <span className="text-gray-500 text-xs">+{props.length - 10} more</span>}
          </div>
        </div>
      );
    }

    // Format for generate_layout
    if (name === 'generate_layout' && r.placedCount !== undefined) {
      const placedCount = Number(r.placedCount);
      const description = r.description ? String(r.description) : '';
      return (
        <div className="mt-2 text-sm text-green-400">
          {placedCount} pieces placed. {description}
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {/* Floating AI Button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        {!isOpen ? (
          <Button
            onClick={() => setOpen(true)}
            className="gap-2 px-6 py-6 rounded-full bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-900/50 hover:shadow-purple-800/60 transition-all hover:scale-105"
          >
            <Sparkles className="h-5 w-5" />
            <span className="font-medium">AI Assistant</span>
          </Button>
        ) : isMinimized ? (
          <Button
            onClick={() => setIsMinimized(false)}
            className="gap-2 px-4 py-4 rounded-full bg-purple-600 hover:bg-purple-500 shadow-lg"
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-sm">Chat</span>
            {messages.length > 0 && (
              <span className="bg-purple-400 text-purple-900 text-xs px-1.5 py-0.5 rounded-full">
                {messages.length}
              </span>
            )}
          </Button>
        ) : null}
      </div>

      {/* Chat Panel */}
      {isOpen && !isMinimized && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[500px] max-w-[calc(100vw-2rem)] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl shadow-black/50 flex flex-col max-h-[500px]">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              <span className="font-medium text-white">AI Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearMessages}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded"
                  title="Clear chat"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded"
                title="Minimize"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-4">
                <div className="text-4xl">🏰</div>
                <div>
                  <h3 className="text-lg font-medium text-white mb-1">Hi! I&apos;m your assistant</h3>
                  <p className="text-gray-400 text-sm">
                    I can create pieces, props, layouts and narrate scenes
                  </p>
                </div>

                <div className="w-full space-y-1.5">
                  <button
                    className="w-full text-left px-3 py-2 bg-gray-800/80 hover:bg-gray-700 rounded-lg text-sm border border-gray-700 hover:border-purple-500/50 transition-colors"
                    onClick={() => sendMessage('I want to create a new piece')}
                    disabled={isLoading}
                  >
                    <span className="text-purple-400">🧩 Create Piece</span>
                    <span className="text-gray-500 ml-2">- Guided step by step</span>
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 bg-gray-800/80 hover:bg-gray-700 rounded-lg text-sm border border-gray-700 hover:border-purple-500/50 transition-colors"
                    onClick={() => sendMessage('I want to create a new terrain type')}
                    disabled={isLoading}
                  >
                    <span className="text-purple-400">🎨 Create Terrain</span>
                    <span className="text-gray-500 ml-2">- Forest, snow, lava...</span>
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 bg-gray-800/80 hover:bg-gray-700 rounded-lg text-sm border border-gray-700 hover:border-purple-500/50 transition-colors"
                    onClick={() => sendMessage('I want to generate props for my scene')}
                    disabled={isLoading}
                  >
                    <span className="text-purple-400">🪑 Generate Props</span>
                    <span className="text-gray-500 ml-2">- NPCs, furniture...</span>
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 bg-gray-800/80 hover:bg-gray-700 rounded-lg text-sm border border-gray-700 hover:border-purple-500/50 transition-colors"
                    onClick={() => sendMessage('Describe the scene for my players')}
                    disabled={isLoading}
                  >
                    <span className="text-purple-400">📖 Narrate Scene</span>
                    <span className="text-gray-500 ml-2">- Read aloud text</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        message.role === 'user'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-white'
                      }`}
                    >
                      {/* Message content */}
                      <div className="whitespace-pre-wrap">{message.content}</div>

                      {/* Tool results (if any) */}
                      {message.toolResults && message.toolResults.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.toolResults.map((result) => (
                            <div key={result.toolCallId}>
                              <div
                                className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${
                                  result.success
                                    ? 'bg-green-900/50 text-green-300'
                                    : 'bg-red-900/50 text-red-300'
                                }`}
                              >
                                {result.success ? (
                                  <CheckCircle className="h-3 w-3" />
                                ) : (
                                  <XCircle className="h-3 w-3" />
                                )}
                                <span>
                                  {result.name.replace(/_/g, ' ')}: {result.success ? 'OK' : result.error}
                                </span>
                              </div>
                              {result.success && formatToolResult(result.result, result.name)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-700 rounded-lg px-3 py-2 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                      <span className="text-sm text-gray-300">Thinking...</span>
                    </div>
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <div className="flex justify-center">
                    <div className="bg-red-900/50 text-red-300 rounded-lg px-3 py-2 flex items-center gap-2 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>{error}</span>
                      <button
                        onClick={clearError}
                        className="text-red-400 hover:text-red-300"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input area */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-gray-700 p-3 flex gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type here..."
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              size="sm"
              className="px-3 bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
