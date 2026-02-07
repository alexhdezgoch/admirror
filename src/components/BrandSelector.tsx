'use client';

import { useState, useRef, useEffect } from 'react';
import { useBrandContext } from '@/context/BrandContext';
import { ChevronDown, Plus, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function BrandSelector() {
  const { clientBrands, currentBrand, setCurrentBrandId } = useBrandContext();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Extract brandId from URL if on a brand-scoped page
  useEffect(() => {
    const match = pathname.match(/\/brands\/([^/]+)/);
    if (match) {
      setCurrentBrandId(match[1]);
    }
  }, [pathname, setCurrentBrandId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't show selector on home page or brand creation
  const isHomePage = pathname === '/';
  const isBrandCreation = pathname === '/brands/new';

  if (isHomePage || isBrandCreation) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white border border-slate-100 hover:border-slate-200 shadow-sm"
      >
        {currentBrand ? (
          <>
            <span className="text-lg">{currentBrand.logo}</span>
            <span className="font-medium text-slate-900 max-w-[140px] truncate">
              {currentBrand.name}
            </span>
          </>
        ) : (
          <span className="text-slate-500">Select Brand</span>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-400 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50">
          {/* All Brands Link */}
          <Link
            href="/"
            onClick={() => {
              setCurrentBrandId(null);
              setIsOpen(false);
            }}
            className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 mx-2 rounded-xl"
          >
            <LayoutGrid className="w-5 h-5 text-slate-400" />
            <span className="text-slate-700 font-medium">All Brands</span>
          </Link>

          <div className="border-t border-slate-50 my-2 mx-4" />

          {/* Brand List */}
          {clientBrands.length > 0 ? (
            clientBrands.map(brand => (
              <Link
                key={brand.id}
                href={`/brands/${brand.id}`}
                onClick={() => {
                  setCurrentBrandId(brand.id);
                  setIsOpen(false);
                }}
                className={`flex items-center gap-3 px-5 py-3 hover:bg-slate-50 mx-2 rounded-xl ${
                  currentBrand?.id === brand.id ? 'bg-indigo-50' : ''
                }`}
              >
                <span className="text-xl">{brand.logo}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">{brand.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{brand.competitors.length} competitors</div>
                </div>
                {currentBrand?.id === brand.id && (
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                )}
              </Link>
            ))
          ) : (
            <div className="px-5 py-4 text-sm text-slate-500">
              No brands yet. Create your first brand!
            </div>
          )}

          <div className="border-t border-slate-50 my-2 mx-4" />

          {/* Add New Brand */}
          <Link
            href="/brands/new"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-5 py-3 hover:bg-indigo-50 mx-2 rounded-xl text-indigo-600"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Add New Brand</span>
          </Link>
        </div>
      )}
    </div>
  );
}
