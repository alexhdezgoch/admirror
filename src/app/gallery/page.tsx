'use client';

import { useState, useMemo } from 'react';
import { useBrandContext } from '@/context/BrandContext';
import { Ad, VelocityTier, AdFormat, VelocitySignal, AdGrade, AdStatus, Competitor } from '@/types';
import { AdCard } from '@/components/AdCard';
import { FilterBar } from '@/components/FilterBar';
import { AdDetailModal } from '@/components/AdDetailModal';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AlertCircle } from 'lucide-react';

export default function GalleryPage() {
  const { allAds, clientBrands, loading, error } = useBrandContext();

  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<AdFormat[]>([]);
  const [selectedVelocities, setSelectedVelocities] = useState<VelocityTier[]>([]);
  const [selectedSignals, setSelectedSignals] = useState<VelocitySignal[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<AdGrade[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<AdStatus>('active');
  const [sortBy, setSortBy] = useState('final');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);

  // Create a flat list of all competitors from all brands for the filter
  const allCompetitors = useMemo(() => {
    const competitors: Competitor[] = [];
    clientBrands.forEach(brand => {
      brand.competitors.forEach(comp => {
        // Avoid duplicates
        if (!competitors.find(c => c.id === comp.id)) {
          competitors.push(comp);
        }
      });
    });
    return competitors;
  }, [clientBrands]);

  // Filter and sort ads
  const filteredAds = useMemo(() => {
    let result = [...allAds];

    // Apply status filter first (active/archived/all)
    // Treat undefined/null isActive as true (backwards compatible with existing ads)
    if (selectedStatus === 'active') {
      result = result.filter(ad => ad.isActive !== false);
    } else if (selectedStatus === 'archived') {
      result = result.filter(ad => ad.isActive === false);
    }
    // 'all' shows everything

    // Apply other filters
    if (selectedBrands.length > 0) {
      result = result.filter(ad => selectedBrands.includes(ad.competitorId));
    }
    if (selectedFormats.length > 0) {
      result = result.filter(ad => selectedFormats.includes(ad.format));
    }
    if (selectedVelocities.length > 0) {
      result = result.filter(ad => selectedVelocities.includes(ad.scoring.velocity.tier));
    }
    if (selectedSignals.length > 0) {
      result = result.filter(ad => selectedSignals.includes(ad.scoring.velocity.signal));
    }
    if (selectedGrades.length > 0) {
      result = result.filter(ad => selectedGrades.includes(ad.scoring.grade));
    }

    // Apply sorting
    switch (sortBy) {
      case 'final':
        result.sort((a, b) => b.scoring.final - a.scoring.final);
        break;
      case 'velocity':
        result.sort((a, b) => b.scoring.velocity.score - a.scoring.velocity.score);
        break;
      case 'value':
        result.sort((a, b) => b.scoring.value.score - a.scoring.value.score);
        break;
      case 'duration':
        result.sort((a, b) => b.daysActive - a.daysActive);
        break;
      case 'variations':
        result.sort((a, b) => b.variationCount - a.variationCount);
        break;
      case 'recent':
        result.sort((a, b) => new Date(b.launchDate).getTime() - new Date(a.launchDate).getTime());
        break;
    }

    return result;
  }, [allAds, selectedBrands, selectedFormats, selectedVelocities, selectedSignals, selectedGrades, selectedStatus, sortBy]);

  // Show loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" message="Loading ads..." />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Data</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Ad Gallery</h1>
        <p className="text-slate-600">
          All competitor ads ranked by spend signals. Click any ad for a detailed breakdown.
        </p>
      </div>

      {/* Filter Bar */}
      <FilterBar
        brands={allCompetitors}
        selectedBrands={selectedBrands}
        onBrandsChange={setSelectedBrands}
        selectedFormats={selectedFormats}
        onFormatsChange={setSelectedFormats}
        selectedVelocities={selectedVelocities}
        onVelocitiesChange={setSelectedVelocities}
        selectedSignals={selectedSignals}
        onSignalsChange={setSelectedSignals}
        selectedGrades={selectedGrades}
        onGradesChange={setSelectedGrades}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        sortBy={sortBy}
        onSortChange={setSortBy}
        view={view}
        onViewChange={setView}
        totalCount={allAds.length}
        filteredCount={filteredAds.length}
      />

      {/* Gallery */}
      {view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredAds.map(ad => (
            <AdCard
              key={ad.id}
              ad={ad}
              view="grid"
              onViewDetail={setSelectedAd}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAds.map(ad => (
            <AdCard
              key={ad.id}
              ad={ad}
              view="list"
              onViewDetail={setSelectedAd}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {filteredAds.length === 0 && (
        <div className="text-center py-16">
          <p className="text-slate-500">No ads match your current filters.</p>
          <button
            onClick={() => {
              setSelectedBrands([]);
              setSelectedFormats([]);
              setSelectedVelocities([]);
              setSelectedSignals([]);
              setSelectedGrades([]);
              setSelectedStatus('active');
            }}
            className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedAd && (
        <AdDetailModal
          ad={selectedAd}
          onClose={() => setSelectedAd(null)}
        />
      )}
    </div>
  );
}
