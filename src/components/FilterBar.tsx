'use client';

import { VelocityTier, AdFormat, VelocitySignal, AdGrade, AdStatus } from '@/types';
import { Brand } from '@/types';
import { Grid3X3, List, X, Archive, CheckCircle2 } from 'lucide-react';

interface FilterBarProps {
  brands: Brand[];
  selectedBrands: string[];
  onBrandsChange: (brands: string[]) => void;
  selectedFormats: AdFormat[];
  onFormatsChange: (formats: AdFormat[]) => void;
  selectedVelocities: VelocityTier[];
  onVelocitiesChange: (velocities: VelocityTier[]) => void;
  selectedSignals: VelocitySignal[];
  onSignalsChange: (signals: VelocitySignal[]) => void;
  selectedGrades: AdGrade[];
  onGradesChange: (grades: AdGrade[]) => void;
  selectedStatus: AdStatus;
  onStatusChange: (status: AdStatus) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
  totalCount: number;
  filteredCount: number;
  brandFilterLabel?: string;
}

const signalConfig: Record<VelocitySignal, { label: string; color: string }> = {
  cash_cow: { label: 'Cash Cow', color: 'bg-green-100 text-green-700 border-green-200' },
  rising_star: { label: 'Rising Star', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  burn_test: { label: 'Burn Test', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  standard: { label: 'Standard', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  zombie: { label: 'Zombie', color: 'bg-slate-200 text-slate-500 border-slate-300' }
};

const gradeConfig: Record<AdGrade, string> = {
  'A+': 'bg-green-100 text-green-800 border-green-200',
  'A': 'bg-green-50 text-green-700 border-green-200',
  'B': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'C': 'bg-orange-50 text-orange-700 border-orange-200',
  'D': 'bg-red-50 text-red-700 border-red-200'
};

export function FilterBar({
  brands,
  selectedBrands,
  onBrandsChange,
  selectedFormats,
  onFormatsChange,
  selectedVelocities,
  onVelocitiesChange,
  selectedSignals,
  onSignalsChange,
  selectedGrades,
  onGradesChange,
  selectedStatus,
  onStatusChange,
  sortBy,
  onSortChange,
  view,
  onViewChange,
  totalCount,
  filteredCount,
  brandFilterLabel = 'Brand'
}: FilterBarProps) {
  const toggleBrand = (brandId: string) => {
    if (selectedBrands.includes(brandId)) {
      onBrandsChange(selectedBrands.filter(b => b !== brandId));
    } else {
      onBrandsChange([...selectedBrands, brandId]);
    }
  };

  const toggleFormat = (format: AdFormat) => {
    if (selectedFormats.includes(format)) {
      onFormatsChange(selectedFormats.filter(f => f !== format));
    } else {
      onFormatsChange([...selectedFormats, format]);
    }
  };

  const toggleVelocity = (velocity: VelocityTier) => {
    if (selectedVelocities.includes(velocity)) {
      onVelocitiesChange(selectedVelocities.filter(v => v !== velocity));
    } else {
      onVelocitiesChange([...selectedVelocities, velocity]);
    }
  };

  const toggleSignal = (signal: VelocitySignal) => {
    if (selectedSignals.includes(signal)) {
      onSignalsChange(selectedSignals.filter(s => s !== signal));
    } else {
      onSignalsChange([...selectedSignals, signal]);
    }
  };

  const toggleGrade = (grade: AdGrade) => {
    if (selectedGrades.includes(grade)) {
      onGradesChange(selectedGrades.filter(g => g !== grade));
    } else {
      onGradesChange([...selectedGrades, grade]);
    }
  };

  const clearFilters = () => {
    onBrandsChange([]);
    onFormatsChange([]);
    onVelocitiesChange([]);
    onSignalsChange([]);
    onGradesChange([]);
    onStatusChange('active'); // Reset to default
  };

  const hasFilters = selectedBrands.length > 0 || selectedFormats.length > 0 || selectedVelocities.length > 0 || selectedSignals.length > 0 || selectedGrades.length > 0 || selectedStatus !== 'active';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 space-y-4">
      {/* Top row: Brands, Format */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Brands filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">{brandFilterLabel}:</span>
          <div className="flex flex-wrap gap-1">
            {brands.map(brand => (
              <button
                key={brand.id}
                onClick={() => toggleBrand(brand.id)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedBrands.includes(brand.id)
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
                }`}
              >
                {brand.logo} {brand.name}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200" />

        {/* Format filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Format:</span>
          <div className="flex gap-1">
            {(['video', 'static', 'carousel'] as AdFormat[]).map(format => (
              <button
                key={format}
                onClick={() => toggleFormat(format)}
                className={`px-3 py-1 text-sm rounded-full capitalize transition-colors ${
                  selectedFormats.includes(format)
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
                }`}
              >
                {format}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200" />

        {/* Active/Archived filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Show:</span>
          <div className="flex gap-1">
            <button
              onClick={() => onStatusChange('active')}
              className={`flex items-center gap-1 px-3 py-1 text-sm rounded-full transition-colors ${
                selectedStatus === 'active'
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Active
            </button>
            <button
              onClick={() => onStatusChange('archived')}
              className={`flex items-center gap-1 px-3 py-1 text-sm rounded-full transition-colors ${
                selectedStatus === 'archived'
                  ? 'bg-slate-300 text-slate-700 border border-slate-400'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
              }`}
            >
              <Archive className="w-3 h-3" />
              Archived
            </button>
            <button
              onClick={() => onStatusChange('all')}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                selectedStatus === 'all'
                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {/* Second row: Status (Tier), Signal, Grade */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Velocity tier filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Status:</span>
          <div className="flex gap-1">
            {(['scaling', 'testing', 'new'] as VelocityTier[]).map(velocity => (
              <button
                key={velocity}
                onClick={() => toggleVelocity(velocity)}
                className={`px-3 py-1 text-sm rounded-full capitalize transition-colors ${
                  selectedVelocities.includes(velocity)
                    ? velocity === 'scaling'
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : velocity === 'testing'
                      ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                      : 'bg-slate-200 text-slate-700 border border-slate-300'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
                }`}
              >
                {velocity}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200" />

        {/* Signal filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Signal:</span>
          <div className="flex flex-wrap gap-1">
            {(['cash_cow', 'rising_star', 'burn_test', 'standard', 'zombie'] as VelocitySignal[]).map(signal => (
              <button
                key={signal}
                onClick={() => toggleSignal(signal)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedSignals.includes(signal)
                    ? signalConfig[signal].color + ' border'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
                }`}
              >
                {signalConfig[signal].label}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200" />

        {/* Grade filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Grade:</span>
          <div className="flex gap-1">
            {(['A+', 'A', 'B', 'C', 'D'] as AdGrade[]).map(grade => (
              <button
                key={grade}
                onClick={() => toggleGrade(grade)}
                className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${
                  selectedGrades.includes(grade)
                    ? gradeConfig[grade] + ' border'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
                }`}
              >
                {grade}
              </button>
            ))}
          </div>
        </div>

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Third row: Count, Sort, View */}
      <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
        {/* Count */}
        <span className="text-sm text-slate-500">
          {filteredCount === totalCount ? (
            `${totalCount} ads`
          ) : (
            `${filteredCount} of ${totalCount} ads`
          )}
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="final">Final Score</option>
          <option value="velocity">Velocity Score</option>
          <option value="value">Value Score</option>
          <option value="duration">Days Active</option>
          <option value="variations">Variations</option>
          <option value="recent">Recently Launched</option>
        </select>

        {/* View toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => onViewChange('grid')}
            className={`p-1.5 rounded transition-colors ${
              view === 'grid' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewChange('list')}
            className={`p-1.5 rounded transition-colors ${
              view === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
