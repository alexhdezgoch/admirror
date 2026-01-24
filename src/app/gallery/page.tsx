'use client';

import { useState, useMemo } from 'react';
import { ads, brands } from '@/data/mockData';
import { Ad, VelocityTier, AdFormat, VelocitySignal, AdGrade, AdStatus } from '@/types';
import { AdCard } from '@/components/AdCard';
import { FilterBar } from '@/components/FilterBar';
import { AdDetailModal } from '@/components/AdDetailModal';

export default function GalleryPage() {
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<AdFormat[]>([]);
  const [selectedVelocities, setSelectedVelocities] = useState<VelocityTier[]>([]);
  const [selectedSignals, setSelectedSignals] = useState<VelocitySignal[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<AdGrade[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<AdStatus>('active');
  const [sortBy, setSortBy] = useState('final');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [adsState, setAdsState] = useState(ads);

  // Filter and sort ads
  const filteredAds = useMemo(() => {
    let result = [...adsState];

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
  }, [adsState, selectedBrands, selectedFormats, selectedVelocities, selectedSignals, selectedGrades, selectedStatus, sortBy]);

  const toggleSwipeFile = (ad: Ad) => {
    setAdsState(prev =>
      prev.map(a =>
        a.id === ad.id ? { ...a, inSwipeFile: !a.inSwipeFile } : a
      )
    );
    if (selectedAd?.id === ad.id) {
      setSelectedAd(prev => prev ? { ...prev, inSwipeFile: !prev.inSwipeFile } : null);
    }
  };

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
        brands={brands}
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
        totalCount={adsState.length}
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
              onToggleSwipeFile={toggleSwipeFile}
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
              onToggleSwipeFile={toggleSwipeFile}
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
          onToggleSwipeFile={toggleSwipeFile}
        />
      )}
    </div>
  );
}
