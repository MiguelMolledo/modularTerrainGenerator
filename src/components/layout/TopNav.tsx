'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Map, FolderOpen, Settings, Package, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

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

const hiddenRoutes = ['/login', '/suspended'];

export function TopNav() {
  const pathname = usePathname();
  const { profile, isLoading, signOut } = useAuth();

  if (hiddenRoutes.includes(pathname)) {
    return null;
  }

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

      {/* User info & sign out */}
      {!isLoading && profile && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.display_name || 'User avatar'}
                width={28}
                height={28}
                className="rounded-full"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-foreground">
                {(profile.display_name || profile.email || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm text-foreground hidden sm:inline">
              {profile.display_name || profile.email}
            </span>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      )}
    </nav>
  );
}
