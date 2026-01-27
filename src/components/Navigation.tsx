'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutGrid, TrendingUp, Settings, Users, LogOut, User, Home } from 'lucide-react';
import { BrandSelector } from './BrandSelector';
import { useAuth } from '@/context/AuthContext';

// Brand-scoped nav items (paths relative to brand)
const brandNavItems = [
  { path: '', label: 'Dashboard', icon: Home },
  { path: 'gallery', label: 'Ad Gallery', icon: LayoutGrid },
  { path: 'trends', label: 'Trends', icon: TrendingUp },
  { path: 'competitors', label: 'Competitors', icon: Users },
];

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  // Extract brandId from URL
  const brandMatch = pathname.match(/\/brands\/([^/]+)/);
  const currentBrandId = brandMatch ? brandMatch[1] : null;
  const isOnBrandPage = !!currentBrandId;

  // Get the current section from the path
  const currentSection = pathname.split('/').pop() || '';

  const handleSignOut = () => {
    router.push('/auth/signout');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AM</span>
              </div>
              <span className="font-semibold text-slate-900">AdMirror</span>
            </Link>

            {/* Brand Selector */}
            <BrandSelector />
          </div>

          {/* Nav Items - Only show when brand is selected */}
          {isOnBrandPage && (
            <div className="flex items-center gap-1">
              {brandNavItems.map((item) => {
                const Icon = item.icon;
                const href = item.path ? `/brands/${currentBrandId}/${item.path}` : `/brands/${currentBrandId}`;
                const isActive = item.path ? currentSection === item.path : currentSection === currentBrandId;

                return (
                  <Link
                    key={item.path}
                    href={href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user && (
              <div className="flex items-center gap-3 ml-2 pl-4 border-l border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span className="text-sm text-slate-600 hidden md:inline max-w-[120px] truncate">
                    {user.email}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            <Link href="/settings" className="p-2 text-slate-400 hover:text-slate-600 transition-colors" title="Settings">
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
