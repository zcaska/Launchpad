import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  ArrowsClockwise,
  WarningCircle,
  Eye,
  EyeSlash,
  ArrowSquareOut,
  CaretDown,
  CaretUp,
  Trash,
  Gear,
  ShieldCheck,
  CheckSquare
} from '@phosphor-icons/react';
import type { TickTickSyncManagerReturn } from '../../services/ticktickSyncManager';
import { validateToken, getProjects, DEFAULT_TICKTICK_PROXY } from '../../services/ticktickService';
import type { TickTickProject } from '../../types/ticktick';

export interface TickTickSettingsCardProps {
  syncManager: TickTickSyncManagerReturn;
}

export const TickTickSettingsCard: React.FC<TickTickSettingsCardProps> = ({ syncManager }) => {
  const { settings, updateSettings, isSyncing, syncError, syncNow } = syncManager;

  const [showToken, setShowToken] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ success: boolean; message: string } | null>(null);
  const [projects, setProjects] = useState<TickTickProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const isConnectedAndActive = Boolean(
    settings.enabled && settings.accessToken?.trim() && settings.selectedProjectId
  );
  const currentError = syncError || settings.lastError;

  const fetchProjectsList = async (token?: string, proxy?: string) => {
    const t = (token ?? settings.accessToken)?.trim();
    if (!t) return;

    setIsLoadingProjects(true);
    setProjectsError(null);
    try {
      const list = await getProjects(t, proxy ?? settings.proxyUrl);
      setProjects(list);

      // Auto-select Inbox or first project if none is currently selected
      if (!settings.selectedProjectId && list.length > 0) {
        const inbox = list.find((p) => p.name.toLowerCase() === 'inbox') || list[0];
        updateSettings({
          ...settings,
          selectedProjectId: inbox.id,
          selectedProjectName: inbox.name,
        });
      }
    } catch (err: any) {
      setProjectsError(err?.message || 'Failed to load TickTick projects');
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // Fetch projects on initial mount if token exists
  useEffect(() => {
    if (settings.accessToken?.trim()) {
      fetchProjectsList();
    }
  }, [settings.accessToken, settings.proxyUrl]);

  const handleToggleEnabled = () => {
    updateSettings({
      ...settings,
      enabled: !settings.enabled,
    });
  };

  const handleTestConnection = async () => {
    if (!settings.accessToken?.trim()) {
      setValidationResult({ success: false, message: 'Please enter an access token first.' });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const res = await validateToken(settings.accessToken, settings.proxyUrl);
      if (res.success) {
        setValidationResult({
          success: true,
          message: `Connected successfully to TickTick as ${res.username || 'User'}!`,
        });
        await fetchProjectsList(settings.accessToken, settings.proxyUrl);
      } else {
        setValidationResult({
          success: false,
          message: res.error || 'Failed to validate TickTick token.',
        });
      }
    } catch (err: any) {
      setValidationResult({
        success: false,
        message: err?.message || 'Connection test failed.',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const projId = e.target.value;
    const proj = projects.find((p) => p.id === projId);
    updateSettings({
      ...settings,
      selectedProjectId: projId,
      selectedProjectName: proj ? proj.name : '',
    });
  };

  const handleDisconnect = () => {
    if (window.confirm('Disconnect TickTick sync? This will clear your access token and selected list.')) {
      updateSettings({
        ...settings,
        enabled: false,
        accessToken: '',
        selectedProjectId: '',
        selectedProjectName: '',
        lastError: undefined,
      });
      setProjects([]);
      setValidationResult(null);
      setProjectsError(null);
    }
  };

  return (
    <div className="p-4 bg-serene-surfaceAlt-light/50 dark:bg-serene-surfaceAlt-dark/50 rounded-xl border border-serene-border-light dark:border-serene-border-dark space-y-3.5">
      {/* Header with Title, Status Badge, and Toggle Switch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
          <CheckSquare className="w-3.5 h-3.5 text-serene-primary dark:text-serene-primary-dark" />
          <span>TickTick Two-Way Sync</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badge */}
          {currentError ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
              <WarningCircle className="w-3 h-3" />
              <span>Sync Error</span>
            </span>
          ) : isConnectedAndActive ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              <CheckCircle className="w-3 h-3" />
              <span>Connected & Active</span>
            </span>
          ) : (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
              Disconnected
            </span>
          )}

          {/* Enable / Disable Toggle Switch */}
          <button
            type="button"
            onClick={handleToggleEnabled}
            className={`w-10 h-5 shrink-0 rounded-full transition-colors relative ${
              settings.enabled ? 'bg-serene-primary' : 'bg-slate-300 dark:bg-slate-700'
            }`}
            aria-label="Toggle TickTick sync"
            title={settings.enabled ? 'Disable TickTick sync' : 'Enable TickTick sync'}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                settings.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <p className="text-[11px] text-serene-text-secondary dark:text-serene-text-darkSecondary leading-relaxed">
        Sync tasks bidirectionally between LaunchPAD and TickTick. Supports automatic background sync, task completion status synchronization, and priority mapping.
      </p>

      {/* Connection Test or Sync Error banners */}
      {validationResult && (
        <div
          className={`p-2.5 rounded-lg border text-[11px] flex items-center gap-1.5 ${
            validationResult.success
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300'
          }`}
        >
          {validationResult.success ? (
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <WarningCircle className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{validationResult.message}</span>
        </div>
      )}

      {currentError && !validationResult && (
        <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-[11px] text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
          <WarningCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Error: {currentError}</span>
        </div>
      )}

      {/* Setup Guide Collapsible */}
      <div className="rounded-lg border border-serene-border-light dark:border-serene-border-dark overflow-hidden bg-white dark:bg-serene-surface-dark">
        <button
          type="button"
          onClick={() => setIsGuideOpen(!isGuideOpen)}
          className="w-full px-3 py-2 flex items-center justify-between text-[11px] font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary hover:bg-serene-surfaceAlt-light/40 dark:hover:bg-serene-surfaceAlt-dark/40 transition-colors"
        >
          <span>How to get a TickTick Access Token (2 mins)</span>
          {isGuideOpen ? <CaretUp className="w-3.5 h-3.5" /> : <CaretDown className="w-3.5 h-3.5" />}
        </button>

        {isGuideOpen && (
          <div className="p-3 border-t border-serene-border-light dark:border-serene-border-dark text-[11px] space-y-2 text-serene-text-secondary dark:text-serene-text-darkSecondary leading-relaxed bg-serene-surfaceAlt-light/20 dark:bg-serene-surfaceAlt-dark/20">
            <ol className="list-decimal list-inside space-y-1 pl-1">
              <li>
                Log into the{' '}
                <a
                  href="https://developer.ticktick.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-serene-primary hover:underline font-semibold inline-flex items-center gap-0.5"
                >
                  TickTick Developer Portal <ArrowSquareOut className="w-2.5 h-2.5" />
                </a>{' '}
                and navigate to <strong>Manage Apps</strong>.
              </li>
              <li>Create a new application or generate a personal OAuth Access Token with task read/write permissions.</li>
              <li>Copy your token and paste it into the Access Token field below.</li>
            </ol>
          </div>
        )}
      </div>

      {/* Access Token Input & Test Connection */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
            TickTick OAuth Access Token
          </label>
          <a
            href="https://developer.ticktick.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-serene-primary hover:underline inline-flex items-center gap-0.5"
          >
            <span>Developer Portal</span>
            <ArrowSquareOut className="w-3 h-3" />
          </a>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type={showToken ? 'text' : 'password'}
              value={settings.accessToken || ''}
              onChange={(e) => updateSettings({ ...settings, accessToken: e.target.value })}
              placeholder="Paste your OAuth access token..."
              className="w-full pl-3 pr-9 py-1.5 text-xs bg-white dark:bg-serene-surface-dark rounded-lg border border-serene-border-light dark:border-serene-border-dark font-mono text-serene-text-primary dark:text-serene-text-darkPrimary placeholder:text-serene-text-muted focus:outline-none focus:ring-1 focus:ring-serene-primary"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-serene-text-muted hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary transition-colors"
              title={showToken ? 'Hide token' : 'Show token'}
            >
              {showToken ? <EyeSlash className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isValidating || !settings.accessToken?.trim()}
            className="px-3 py-1.5 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark hover:bg-black/5 dark:hover:bg-white/5 text-serene-text-primary dark:text-serene-text-darkPrimary border border-serene-border-light dark:border-serene-border-dark rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 disabled:opacity-50"
          >
            {isValidating ? (
              <>
                <ArrowsClockwise className="w-3.5 h-3.5 animate-spin" />
                <span>Testing...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-serene-primary dark:text-serene-primary-dark" />
                <span>Test Connection</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Target Project Dropdown */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
            Target TickTick Project / List
          </label>
          {settings.accessToken?.trim() && (
            <button
              type="button"
              onClick={() => fetchProjectsList()}
              disabled={isLoadingProjects}
              className="text-[11px] text-serene-primary dark:text-serene-primary-dark hover:underline inline-flex items-center gap-1 disabled:opacity-50"
            >
              <ArrowsClockwise className={`w-3 h-3 ${isLoadingProjects ? 'animate-spin' : ''}`} />
              <span>Refresh lists</span>
            </button>
          )}
        </div>

        <select
          value={settings.selectedProjectId || ''}
          onChange={handleProjectChange}
          disabled={!settings.accessToken?.trim() || isLoadingProjects}
          className="w-full px-3 py-1.5 text-xs bg-white dark:bg-serene-surface-dark rounded-lg border border-serene-border-light dark:border-serene-border-dark text-serene-text-primary dark:text-serene-text-darkPrimary focus:outline-none focus:ring-1 focus:ring-serene-primary disabled:opacity-50"
        >
          {!settings.selectedProjectId && (
            <option value="">-- Select a TickTick Project / List --</option>
          )}
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} {p.closed ? '(Closed)' : ''}
            </option>
          ))}
          {settings.selectedProjectId && !projects.some((p) => p.id === settings.selectedProjectId) && (
            <option value={settings.selectedProjectId}>
              {settings.selectedProjectName || settings.selectedProjectId}
            </option>
          )}
        </select>
        {projectsError && (
          <p className="text-[10px] text-rose-600 dark:text-rose-400">
            {projectsError}
          </p>
        )}
      </div>

      {/* Auto-sync Interval Selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
          Auto-Sync Interval
        </label>
        <select
          value={settings.autoSyncIntervalMinutes || 5}
          onChange={(e) => updateSettings({ ...settings, autoSyncIntervalMinutes: Number(e.target.value) })}
          className="w-full px-3 py-1.5 text-xs bg-white dark:bg-serene-surface-dark rounded-lg border border-serene-border-light dark:border-serene-border-dark text-serene-text-primary dark:text-serene-text-darkPrimary focus:outline-none focus:ring-1 focus:ring-serene-primary"
        >
          <option value={5}>Every 5 minutes (Recommended)</option>
          <option value={15}>Every 15 minutes</option>
          <option value={30}>Every 30 minutes</option>
        </select>
      </div>

      {/* Advanced Proxy Settings Collapsible */}
      <div className="rounded-lg border border-serene-border-light dark:border-serene-border-dark overflow-hidden bg-white dark:bg-serene-surface-dark">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-3 py-2 flex items-center justify-between text-[11px] font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary hover:bg-serene-surfaceAlt-light/40 dark:hover:bg-serene-surfaceAlt-dark/40 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Gear className="w-3.5 h-3.5 text-serene-text-muted" />
            <span>Advanced Proxy Configuration</span>
          </span>
          {showAdvanced ? <CaretUp className="w-3.5 h-3.5" /> : <CaretDown className="w-3.5 h-3.5" />}
        </button>

        {showAdvanced && (
          <div className="p-3 border-t border-serene-border-light dark:border-serene-border-dark text-[11px] space-y-2 bg-serene-surfaceAlt-light/20 dark:bg-serene-surfaceAlt-dark/20">
            <label className="block text-xs font-medium text-serene-text-secondary dark:text-serene-text-darkSecondary">
              Proxy URL (default: {DEFAULT_TICKTICK_PROXY})
            </label>
            <input
              type="text"
              value={settings.proxyUrl ?? ''}
              onChange={(e) => updateSettings({ ...settings, proxyUrl: e.target.value.trim() || undefined })}
              placeholder={DEFAULT_TICKTICK_PROXY}
              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-serene-surface-dark rounded-lg border border-serene-border-light dark:border-serene-border-dark font-mono text-serene-text-primary dark:text-serene-text-darkPrimary placeholder:text-serene-text-muted focus:outline-none focus:ring-1 focus:ring-serene-primary"
            />
            <p className="text-[10px] text-serene-text-muted">
              TickTick Open API requires proxying in browser environments to avoid CORS restrictions.
            </p>
          </div>
        )}
      </div>

      {/* Footer Controls: Disconnect & Sync Now */}
      <div className="flex items-center justify-between pt-2 border-t border-serene-border-light/60 dark:border-serene-border-dark/60">
        <div>
          {(settings.accessToken || settings.selectedProjectId) && (
            <button
              type="button"
              onClick={handleDisconnect}
              className="px-3 py-1.5 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Trash className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {settings.lastSyncedAt && (
            <span className="text-[10px] text-serene-text-muted">
              Last synced {new Date(settings.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            type="button"
            onClick={() => syncNow()}
            disabled={isSyncing || !isConnectedAndActive}
            className="px-3.5 py-1.5 bg-serene-primary hover:bg-serene-primary-hover text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
          >
            <ArrowsClockwise className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
