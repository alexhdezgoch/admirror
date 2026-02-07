'use client';

import { PlaybookRow } from '@/types/playbook';
import { BookOpen, Calendar, Trash2, Share2, ExternalLink } from 'lucide-react';

interface Props {
  playbooks: PlaybookRow[];
  selectedId?: string;
  onSelect: (playbook: PlaybookRow) => void;
  onDelete: (id: string) => void;
  onShare: (playbook: PlaybookRow) => void;
}

export function PlaybookList({ playbooks, selectedId, onSelect, onDelete, onShare }: Props) {
  if (playbooks.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-700">Previous Playbooks</h3>
      </div>

      <div className="divide-y divide-slate-100">
        {playbooks.map((playbook) => (
          <div
            key={playbook.id}
            className={`flex items-center justify-between px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors ${
              selectedId === playbook.id ? 'bg-indigo-50 border-l-2 border-indigo-500' : ''
            }`}
            onClick={() => onSelect(playbook)}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {playbook.title}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar className="w-3 h-3" />
                  {new Date(playbook.created_at).toLocaleDateString()}
                  {playbook.is_public && (
                    <span className="flex items-center gap-1 text-green-600">
                      <ExternalLink className="w-3 h-3" />
                      Shared
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(playbook);
                }}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(playbook.id);
                }}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
