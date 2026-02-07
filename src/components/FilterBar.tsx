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
    <div className="bg-white border border-slate-100 rounded-2xl p-5 mb-8 space-y-5 shadow-sm">
      {/* Top row: Brands, Format */}
      <div className="flex flex-wrap items-center gap-5">
        {/* Brands filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-600">{brandFilterLabel}:</span>
          <div className="flex flex-wrap gap-1.5">
            {brands.map(brand => (
              <button
                key={brand.id}
                onClick={() => toggleBrand(brand.id)}
                className={`px-4 py-1.5 text-sm rounded-full ${
                  selectedBrands.includes(brand.id)
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
                }`}
              >
                {brand.logo} {brand.name}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-100" />

        {/* Format filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-600">Format:</span>
          <div className="flex gap-1.5">
            {(['video', 'static', 'carousel'] as AdFormat[]).map(format => (
              <button
                key={format}
                onClick={() => toggleFormat(format)}
                className={`px-4 py-1.5 text-sm rounded-full capitalize ${
                  selectedFormats.includes(format)
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
                }`}
              >
                {format}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-100" />

        {/* Active/Archived filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-600">Show:</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => onStatusChange('active')}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-full ${
                selectedStatus === 'active'
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Active
            </button>
            <button
              onClick={() => onStatusChange('archived')}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-full ${
                selectedStatus === 'archived'
                  ? 'bg-slate-200 text-slate-700 border border-slate-300'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              Archived
            </button>
            <button
              onClick={() => onStatusChange('all')}
              className={`px-4 py-1.5 text-sm rounded-full ${
                selectedStatus === 'all'
                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {/* Second row: Status (Tier), Signal, Grade */}
      <div className="flex flex-wrap items-center gap-5">
        {/* Velocity tier filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-600">Status:</span>
          <div className="flex gap-1.5">
            {(['scaling', 'testing', 'new'] as VelocityTier[]).map(velocity => (
              <button
                key={velocity}
                onClick={() => toggleVelocity(velocity)}
                className={`px-4 py-1.5 text-sm rounded-full capitalize ${
                  selectedVelocities.includes(velocity)
                    ? velocity === 'scaling'
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : velocity === 'testing'
                      ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                      : 'bg-slate-200 text-slate-700 border border-slate-300'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
                }`}
              >
                {velocity}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-100" />

        {/* Signal filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-600">Signal:</span>
          <div className="flex flex-wrap gap-1.5">
            {(['cash_cow', 'rising_star', 'burn_test', 'standard', 'zombie'] as VelocitySignal[]).map(signal => (
              <button
                key={signal}
                onClick={() => toggleSignal(signal)}
                className={`px-4 py-1.5 text-sm rounded-full ${
                  selectedSignals.includes(signal)
                    ? signalConfig[signal].color + ' border'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
                }`}
              >
                {signalConfig[signal].label}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-100" />

        {/* Grade filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-600">Grade:</span>
          <div className="flex gap-1.5">
            {(['A+', 'A', 'B', 'C', 'D'] as AdGrade[]).map(grade => (
              <button
                key={grade}
                onClick={() => toggleGrade(grade)}
                className={`px-4 py-1.5 text-sm rounded-full font-medium ${
                  selectedGrades.includes(grade)
                    ? gradeConfig[grade] + ' border'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
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
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-50"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Third row: Count, Sort, View */}
      <div className="flex items-center gap-5 pt-4 border-t border-slate-50">
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
          className="px-4 py-2 text-sm border border-slate-100 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="final">Final Score</option>
          <option value="velocity">Velocity Score</option>
          <option value="value">Value Score</option>
          <option value="duration">Days Active</option>
          <option value="variations">Variations</option>
          <option value="recent">Recently Launched</option>
        </select>

        {/* View toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-xl">
          <button
            onClick={() => onViewChange('grid')}
            className={`p-2 rounded-lg ${
              view === 'grid' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewChange('list')}
            className={`p-2 rounded-lg ${
              view === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
