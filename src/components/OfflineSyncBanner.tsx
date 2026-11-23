import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CloudOff,
  RefreshCw,
  Trash2,
  Wifi,
} from 'lucide-react';
import { OfflineTransaction } from '../services/offlineSyncService';

interface OfflineSyncBannerProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingTransactions: OfflineTransaction[];
  lastSyncedCount: number;
  isAuthenticated: boolean;
  onSyncNow: () => void;
  onDiscardPending: (id: string) => void;
}

export const OfflineSyncBanner: React.FC<OfflineSyncBannerProps> = ({
  isOnline,
  isSyncing,
  pendingTransactions,
  lastSyncedCount,
  isAuthenticated,
  onSyncNow,
  onDiscardPending,
}) => {
  const [expanded, setExpanded] = useState(false);

  const pendingCount = pendingTransactions.length;
  const shouldShow =
    !isOnline || isSyncing || pendingCount > 0 || lastSyncedCount > 0;

  if (!shouldShow) return null;

  return (
    <div className="no-print fixed bottom-4 left-4 z-40 max-w-sm w-[calc(100vw-2rem)] sm:w-auto">
      <div
        className={`rounded-xl shadow-lg border text-xs transition-colors ${
          !isOnline
            ? 'bg-amber-600 text-white border-amber-700'
            : isSyncing
              ? 'bg-[#0F2342] text-white border-[#1A355E]'
              : pendingCount > 0
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-amber-300 dark:border-amber-700'
                : 'bg-emerald-700 text-white border-emerald-800'
        }`}
      >
        <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {!isOnline ? (
              <CloudOff className="w-4 h-4 shrink-0" />
            ) : isSyncing ? (
              <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
            ) : pendingCount > 0 ? (
              <Wifi className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}

            <div className="min-w-0">
              <p className="font-semibold truncate">
                {!isOnline
                  ? 'Mode hors-ligne · Catalogue & panier actifs'
                  : isSyncing
                    ? `Synchronisation en cours (${pendingCount})...`
                    : pendingCount > 0
                      ? `${pendingCount} transaction(s) en attente de synchro`
                      : `${lastSyncedCount} transaction(s) synchronisée(s)`}
              </p>
              {!isOnline && pendingCount > 0 && (
                <p className="text-[11px] opacity-90">
                  {pendingCount} opération(s) sauvegardée(s) localement
                </p>
              )}
              {isOnline && pendingCount > 0 && !isAuthenticated && (
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  Connectez-vous avec Google pour finaliser l’envoi
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isOnline && pendingCount > 0 && !isSyncing && isAuthenticated && (
              <button
                type="button"
                onClick={onSyncNow}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#0F2342] text-white hover:bg-[#1A355E] dark:bg-[#D9531E] dark:hover:bg-[#B84315] cursor-pointer"
              >
                Synchroniser
              </button>
            )}
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                aria-label="Afficher la file hors-ligne"
              >
                {expanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {expanded && pendingCount > 0 && (
          <div className="border-t border-black/10 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-b-xl p-3 max-h-56 overflow-y-auto space-y-2">
            {pendingTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-start justify-between gap-2 text-[11px] pb-2 border-b border-slate-100 dark:border-slate-800 last:border-b-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-semibold truncate">{tx.label}</p>
                  <p className="text-slate-500 dark:text-slate-400">
                    {new Date(tx.createdAt).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {tx.retries > 0 ? ` · ${tx.retries} tentative(s)` : ''}
                  </p>
                  {tx.lastError && (
                    <p className="text-red-600 dark:text-red-400 truncate">
                      {tx.lastError}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onDiscardPending(tx.id)}
                  className="p-1 text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
                  title="Retirer de la file locale"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
