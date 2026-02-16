'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Map, FolderOpen, Settings, Package } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Home', icon: <Home className="h-4 w-4" /> },
  { href: '/inventory', label: 'Inventory', icon: <Package className="h-4 w-4" /> },
  { href: '/designer', label: 'Designer', icon: <Map className="h-4 w-4" /> },
  { href: '/maps', label: 'My Maps', icon: <FolderOpen className="h-4 w-4" /> },
  { href: '/settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="h-12 bg-background border-b border-border flex items-center px-4">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mr-8">
        <span className="text-2xl">🗺️</span>
        <span className="font-bold text-foreground hidden sm:inline">Terrain Creator</span>
      </Link>

      {/* Navigation links */}
      <div className="flex items-center gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-card text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {item.icon}
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side - could add user menu, etc. */}
      <div className="text-xs text-muted-foreground">
        Modular Terrain Creator
      </div>
    </nav>
  );
}
