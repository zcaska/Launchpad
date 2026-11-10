import React, { useRef, useState } from 'react';
import {
  DownloadSimple as Download,
  UploadSimple as Upload,
  ShieldCheck,
  Copy,
  Check,
  Command,
  Clock,
  Lightning as Zap,
  Key,
  ChartBar as BarChart2,
  Trash
} from '@phosphor-icons/react';
import { AppData, type ConfettiStyle } from '../../types';
import { ConfettiOverlay } from '../Dashboard/ConfettiOverlay';
import { exportDataAsJson, importDataFromJson, getStorageMetrics } from '../../utils/storage';
import { DEFAULT_INITIAL_PREFERENCES } from '../../data/seedData';
import { Mascot } from '../Pet/Mascot';
import { MascotShowcaseModal } from '../Pet/MascotShowcaseModal';
import { CloudWorkspaceSettings } from './CloudWorkspaceSettings';
import type { CloudWorkspace } from '../../services/cloudWorkspace';
import type { useCloudSync } from '../../services/useCloudSync';

interface SettingsScreenProps {
  onThemeChange: (theme: AppData['settings']['theme']) => void;
  onOpenSparkIdea: () => void;
  onClose: () => void;
  appData: AppData;
  onUpdateAppData: (data: AppData) => void;
  onClearAllData: () => Promise<void> | void;
  workspace?: CloudWorkspace | null;
  onSwitchWorkspace?: (workspace: CloudWorkspace | null) => void;
  cloudSync?: ReturnType<typeof useCloudSync>;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onThemeChange,
  onOpenSparkIdea,
  onClose,
  appData,
  onUpdateAppData,
  onClearAllData,
  workspace = null,
  onSwitchWorkspace,
  cloudSync,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isMascotShowcaseOpen, setIsMascotShowcaseOpen] = useState(false);
  const [confettiPreview, setConfettiPreview] = useState<{ style: ConfettiStyle; key: number } | null>(null);
  const [isClearingData, setIsClearingData] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentAppUrl = window.location.href;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentAppUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleExport = () => {
    exportDataAsJson(appData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = importDataFromJson(text, !workspace);
        onUpdateAppData(imported);
        alert('Data successfully imported and restored!');
      } catch (err: any) {
        alert('Failed to import backup file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleClearAllDataConfirm = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear all data?\n\nThis will permanently delete all tasks, notes, bookmarks, reflections, and progress from both local storage and the cloud.\n\nYour account will NOT be deleted and you will NOT be signed out.'
    );
    if (!confirmed) return;

    try {
      setIsClearingData(true);
      await onClearAllData();
      alert('All data has been successfully cleared from local and cloud storage.');
      onClose();
    } catch (err: any) {
      alert('Failed to clear data: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsClearingData(false);
    }
  };

  const handleResetLearningWeights = () => {
    if (confirm('Reset recommendation learning algorithm weights back to initial defaults?')) {
      onUpdateAppData({
        ...appData,
        learnedPreferences: DEFAULT_INITIAL_PREFERENCES,
      });
      alert('Algorithm weights reset successfully.');
    }
  };

  const updateSetting = (key: keyof AppData['settings'], value: any) => {
    onUpdateAppData({
      ...appData,
      settings: {
        ...appData.settings,
        [key]: value,
      },
    });
  };

  const updateDaySchedule = (key: keyof AppData['settings']['daySchedule'], value: any) => {
    onUpdateAppData({
      ...appData,
      settings: {
        ...appData.settings,
        daySchedule: {
          ...appData.settings.daySchedule,
          [key]: value,
        },
      },
    });
  };

  const updateOpenRouter = (key: keyof AppData['settings']['openRouter'], value: any) => {
    onUpdateAppData({
      ...appData,
      settings: {
        ...appData.settings,
        openRouter: {
          ...appData.settings.openRouter,
          [key]: value,
        },
      },
    });
  };

  return (
    <>
      <div className="mx-auto w-full max-w-3xl px-2 py-4 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold">Settings</h1>
          <button type="button" onClick={onClose} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-serene-primary dark:text-serene-primary-dark">
            Back
          </button>
        </div>
        {/* Content */}
        <div className="mobile-settings-content space-y-6 text-sm">
          <section aria-labelledby="appearance-heading" className="space-y-3 rounded-xl border border-serene-border-light p-3 sm:p-4 dark:border-serene-border-dark">
            <h2 id="appearance-heading" className="font-bold">Appearance</h2>
            <label className="flex flex-wrap items-center justify-between gap-3">
              Theme
              <select value={appData.settings.theme} onChange={(event) => onThemeChange(event.target.value as AppData['settings']['theme'])}
                className="rounded-lg border border-serene-border-light bg-serene-surfaceAlt-light px-3 py-2 dark:border-serene-border-dark dark:bg-serene-surfaceAlt-dark">
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <button type="button" onClick={onOpenSparkIdea} className="font-semibold text-serene-primary dark:text-serene-primary-dark md:hidden">
              Spark an idea
            </button>
          </section>
          {Boolean(appData.reflections?.length) && (
            <section className="rounded-xl border border-serene-border-light dark:border-serene-border-dark p-4 space-y-3 text-serene-text-primary dark:text-serene-text-darkPrimary">
              <h3 className="font-bold text-sm">Reflection journal</h3>
              {[...(appData.reflections || [])].reverse().map((entry, index) => (
                <details key={`${entry.date}-${index}`} className="rounded-lg border border-serene-border-light dark:border-serene-border-dark p-3">
                  <summary className="cursor-pointer font-semibold">{new Date(entry.date).toLocaleString()} · {entry.taskTitles.join(', ')}</summary>
                  {entry.questions.map((question, i) => (
                    <div key={i} className="mt-3 space-y-1">
                      <p className="font-semibold">{question}</p>
                      <p className="whitespace-pre-wrap leading-relaxed text-serene-text-secondary dark:text-serene-text-darkSecondary">{entry.answers[i]}</p>
                    </div>
                  ))}
                </details>
              ))}
            </section>
          )}
          {onSwitchWorkspace && cloudSync && (
            <CloudWorkspaceSettings workspace={workspace} onSwitch={onSwitchWorkspace} sync={cloudSync} />
          )}

          {/* Time Snatch Redirect Integration Banner */}
          <div className="p-4 bg-serene-primary-soft/60 dark:bg-serene-primary/10 border border-serene-primary/20 rounded-xl space-y-2.5">
            <div className="flex items-center gap-2 text-serene-primary dark:text-serene-primary-dark font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
              <span>Time Snatch Extension Configuration</span>
            </div>
            <p className="text-serene-text-secondary dark:text-serene-text-darkSecondary leading-relaxed text-[11px]">
              Set this URL as your redirect destination inside the <strong>Time Snatch</strong> extension options for YouTube, Reddit, Twitter, etc.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={currentAppUrl}
                className="flex-1 min-w-0 bg-white dark:bg-serene-surface-dark px-3 py-1.5 rounded-lg border border-serene-border-light dark:border-serene-border-dark font-mono text-[11px] text-serene-text-primary dark:text-serene-text-darkPrimary select-all"
              />
              <button
                onClick={handleCopyUrl}
                className="px-3 py-1.5 bg-serene-primary hover:bg-serene-primary-hover text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors shrink-0"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Copied URL!' : 'Copy URL'}</span>
              </button>
            </div>
          </div>

          {/* Active Day Schedule (for Time Radar) */}
          <div className="space-y-3">
            <h3 className="font-bold text-serene-text-primary dark:text-serene-text-darkPrimary flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-serene-primary dark:text-serene-primary-dark" />
              <span>Active Day Schedule (Time Radar)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-serene-surfaceAlt-light/50 dark:bg-serene-surfaceAlt-dark/50 rounded-xl border border-serene-border-light dark:border-serene-border-dark space-y-1.5">
                <label className="block text-[11px] font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary">
                  Day Start Hour (Wake/Work)
                </label>
                <select
                  value={appData.settings.daySchedule.startHour}
                  onChange={(e) => updateDaySchedule('startHour', parseInt(e.target.value, 10))}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-serene-surface-dark rounded-lg border border-serene-border-light dark:border-serene-border-dark font-mono text-xs"
                >
                  {[6, 7, 8, 9, 10, 11, 12].map((h) => (
                    <option key={h} value={h}>{h}:00 AM</option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-serene-surfaceAlt-light/50 dark:bg-serene-surfaceAlt-dark/50 rounded-xl border border-serene-border-light dark:border-serene-border-dark space-y-1.5">
                <label className="block text-[11px] font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary">
                  Day Cutoff Hour (Bedtime / End of Day)
                </label>
                <select
                  value={appData.settings.daySchedule.endHour}
                  onChange={(e) => updateDaySchedule('endHour', parseInt(e.target.value, 10))}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-serene-surface-dark rounded-lg border border-serene-border-light dark:border-serene-border-dark font-mono text-xs"
                >
                  {[18, 19, 20, 21, 22, 23, 24].map((h) => (
                    <option key={h} value={h}>
                      {h === 24 ? '12:00 AM (Midnight)' : `${h - 12}:00 PM`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Algorithm Learning Insights Panel */}
          <div className="p-4 bg-serene-surfaceAlt-light/50 dark:bg-serene-surfaceAlt-dark/50 rounded-xl border border-serene-border-light dark:border-serene-border-dark space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
                <BarChart2 className="w-3.5 h-3.5 text-serene-primary dark:text-serene-primary-dark" />
                <span>Recommendation Algorithm Learning Weights</span>
              </div>
              <button
                type="button"
                onClick={handleResetLearningWeights}
                className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline font-semibold"
              >
                Reset Learning
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 bg-white dark:bg-serene-surface-dark rounded-lg border border-serene-border-light dark:border-serene-border-dark">
                <span className="text-serene-text-muted">Total Approvals:</span>
                <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                  {appData.learnedPreferences.approvalsCount}
                </div>
              </div>
              <div className="p-2.5 bg-white dark:bg-serene-surface-dark rounded-lg border border-serene-border-light dark:border-serene-border-dark">
                <span className="text-serene-text-muted">Total Rejections:</span>
                <div className="font-bold text-amber-600 dark:text-amber-400 font-mono text-sm">
                  {appData.learnedPreferences.rejectionsCount}
                </div>
              </div>
            </div>
          </div>

          {workspace && <p className="text-sm">OpenRouter is available in the local workspace.</p>}
          {!workspace && <>
          {/* Optional OpenRouter API Web Discovery */}
          <div className="p-4 rounded-xl border border-serene-border-light dark:border-serene-border-dark space-y-3 bg-white dark:bg-serene-surface-dark">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
                    OpenRouter API Fallback (Optional)
                  </h4>
                  <p className="text-[10px] text-serene-text-muted">
                    Fetch AI web ideas for fresh focus inspirations.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => updateOpenRouter('enabled', !appData.settings.openRouter.enabled)}
                className={`w-10 h-5 shrink-0 rounded-full transition-colors relative ${
                  appData.settings.openRouter.enabled ? 'bg-serene-primary' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    appData.settings.openRouter.enabled ? 'transform translate-x-5' : ''
                  }`}
                />
              </button>
            </div>

            {appData.settings.openRouter.enabled && (
              <div className="space-y-3 pt-2 animate-fadeIn">
                <div>
                  <label className="block text-[11px] font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary mb-1 flex items-center gap-1">
                    <Key className="w-3 h-3" /> OpenRouter API Key
                  </label>
                  <input
                    type="password"
                    value={appData.settings.openRouter.apiKey || ''}
                    onChange={(e) => updateOpenRouter('apiKey', e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="w-full px-3 py-1.5 text-xs bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark rounded-lg border border-serene-border-light dark:border-serene-border-dark font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary mb-1">
                      Model
                    </label>
                    <select
                      value={appData.settings.openRouter.model}
                      onChange={(e) => updateOpenRouter('model', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark rounded-lg border border-serene-border-light dark:border-serene-border-dark"
                    >
                      <option value="google/gemini-2.0-flash-001">Google Gemini 2.0 Flash (Fast & Cheap)</option>
                      <option value="meta-llama/llama-3.3-70b-instruct">Llama 3.3 70B Instruct</option>
                      <option value="anthropic/claude-3.5-haiku">Claude 3.5 Haiku</option>
                      <option value="deepseek/deepseek-chat">DeepSeek Chat</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary mb-1">
                      Daily Limit (Rate Guard)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={appData.settings.openRouter.dailyLimit}
                      onChange={(e) => updateOpenRouter('dailyLimit', parseInt(e.target.value, 10) || 20)}
                      className="w-full px-2.5 py-1.5 text-xs bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark rounded-lg border border-serene-border-light dark:border-serene-border-dark font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          </>}

          {/* Data Backup & Restore */}
          <div className="space-y-3">
            <h3 className="font-bold text-serene-text-primary dark:text-serene-text-darkPrimary flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-serene-primary dark:text-serene-primary-dark" />
              <span>Data Backup & Storage Health</span>
            </h3>

            {/* Storage Health & Capacity */}
            {(() => {
              const metrics = getStorageMetrics();
              return (
                <div className="p-3 bg-serene-surfaceAlt-light/60 dark:bg-serene-surfaceAlt-dark/60 rounded-xl border border-serene-border-light dark:border-serene-border-dark space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-serene-text-primary dark:text-serene-text-darkPrimary flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Local Storage Health</span>
                    </span>
                    <span className="text-serene-text-secondary dark:text-serene-text-darkSecondary font-mono text-[11px]">
                      {metrics.usedFormatted} used ({metrics.quotaUsagePercent}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        metrics.quotaUsagePercent > 80
                          ? 'bg-rose-500'
                          : metrics.quotaUsagePercent > 50
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(2, metrics.quotaUsagePercent)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-serene-text-muted">
                    <span>{metrics.taskCount} active tasks · Focus queue active</span>
                    <span>{metrics.hasBackup ? '✓ Rolling backup active' : 'Backup pending'}</span>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                onClick={handleExport}
                className="p-3 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark hover:bg-white dark:hover:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-xl flex items-center gap-3 transition-all hover:border-serene-primary/40 group text-left"
              >
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
                    Export Backup (.json)
                  </div>
                  <div className="text-[10px] text-serene-text-muted">Download all data & learning weights</div>
                </div>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark hover:bg-white dark:hover:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-xl flex items-center gap-3 transition-all hover:border-serene-primary/40 group text-left"
              >
                <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
                    Import Backup (.json)
                  </div>
                  <div className="text-[10px] text-serene-text-muted">Restore data from file</div>
                </div>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Preferences */}
          <div className="space-y-3 pt-2 border-t border-serene-border-light dark:border-serene-border-dark">
            <h3 className="font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
              Dashboard Preferences
            </h3>

            <div className="space-y-2.5">
              {/* Clock format */}
              <div className="flex items-center justify-between p-2.5 bg-serene-surfaceAlt-light/50 dark:bg-serene-surfaceAlt-dark/50 rounded-lg border border-serene-border-light dark:border-serene-border-dark">
                <div>
                  <div className="font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
                    Clock Format
                  </div>
                  <div className="text-[10px] text-serene-text-muted">Switch between 12-hour and 24-hour clock</div>
                </div>
                <button
                  onClick={() => updateSetting('clockFormat', appData.settings.clockFormat === '12h' ? '24h' : '12h')}
                  className="px-3 py-1 bg-white dark:bg-serene-surface-dark rounded-md border border-serene-border-light dark:border-serene-border-dark font-mono font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary"
                >
                  {appData.settings.clockFormat.toUpperCase()}
                </button>
              </div>

              {/* Open in new tab */}
              <div className="flex items-center justify-between p-2.5 bg-serene-surfaceAlt-light/50 dark:bg-serene-surfaceAlt-dark/50 rounded-lg border border-serene-border-light dark:border-serene-border-dark">
                <div>
                  <div className="font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
                    Open Links in New Tab
                  </div>
                  <div className="text-[10px] text-serene-text-muted">Keep LaunchPad open in background</div>
                </div>
                <button
                  onClick={() => updateSetting('openInNewTab', !appData.settings.openInNewTab)}
                  className={`w-10 h-5 shrink-0 rounded-full transition-colors relative ${
                    appData.settings.openInNewTab ? 'bg-serene-primary' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      appData.settings.openInNewTab ? 'transform translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Confetti celebration style */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-serene-surfaceAlt-light/50 dark:bg-serene-surfaceAlt-dark/50 rounded-lg border border-serene-border-light dark:border-serene-border-dark">
                <div className="min-w-0">
                  <div className="font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
                    Confetti Celebration
                  </div>
                  <div className="text-[10px] text-serene-text-muted">Choose a style to preview its celebration animation</div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {([
                    { id: 'cascade', label: 'Cascade' },
                    { id: 'burst', label: 'Burst' },
                    { id: 'sparkle', label: 'Sparkle' },
                  ] as const).map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => {
                        updateSetting('confettiStyle', id);
                        setConfettiPreview({ style: id, key: Date.now() });
                      }}
                      className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-md border transition-all ${
                        (appData.settings.confettiStyle || 'cascade') === id
                          ? 'bg-serene-primary text-white border-serene-primary shadow-2xs'
                          : 'bg-white dark:bg-serene-surface-dark text-serene-text-secondary dark:text-serene-text-darkSecondary border-serene-border-light dark:border-serene-border-dark hover:border-serene-primary/40'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Launchpad Pet enable */}
              <div className="flex items-center justify-between p-2.5 bg-serene-surfaceAlt-light/50 dark:bg-serene-surfaceAlt-dark/50 rounded-lg border border-serene-border-light dark:border-serene-border-dark">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/20 flex items-center justify-center shrink-0">
                    <Mascot size={26} expression="welcoming" />
                  </div>
                  <div>
                    <div className="font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary flex items-center gap-1.5">
                      <span>Launchpad Mascot Pet</span>
                      <button
                        type="button"
                        onClick={() => setIsMascotShowcaseOpen(true)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 hover:bg-orange-500/25 transition-colors font-medium"
                      >
                        Model Sheet & Assets →
                      </button>
                    </div>
                    <div className="text-[10px] text-serene-text-muted">Floating-pebble companion that reacts to tasks & focus</div>
                  </div>
                </div>
                <button
                  onClick={() => updateSetting('pet', { ...(appData.settings.pet || {}), enabled: !(appData.settings.pet?.enabled !== false) })}
                  className={`w-10 h-5 shrink-0 rounded-full transition-colors relative ${
                    appData.settings.pet?.enabled !== false ? 'bg-serene-primary' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-label="Toggle Launchpad pet"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      appData.settings.pet?.enabled !== false ? 'transform translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Pet movement pause */}
              <div className="flex items-center justify-between p-2.5 bg-serene-surfaceAlt-light/50 dark:bg-serene-surfaceAlt-dark/50 rounded-lg border border-serene-border-light dark:border-serene-border-dark">
                <div>
                  <div className="font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
                    Pet Movement
                  </div>
                  <div className="text-[10px] text-serene-text-muted">Let it wander, or keep it sitting still</div>
                </div>
                <button
                  onClick={() => updateSetting('pet', { enabled: appData.settings.pet?.enabled !== false, paused: !appData.settings.pet?.paused })}
                  className={`w-10 h-5 shrink-0 rounded-full transition-colors relative ${
                    !appData.settings.pet?.paused ? 'bg-serene-primary' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-label="Toggle pet movement"
                  title="Movement pauses automatically during focus sessions"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      !appData.settings.pet?.paused ? 'transform translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Streak celebrations */}
              <div className="flex items-center justify-between p-2.5 bg-serene-surfaceAlt-light/50 dark:bg-serene-surfaceAlt-dark/50 rounded-lg border border-serene-border-light dark:border-serene-border-dark">
                <div>
                  <div className="font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
                    Streak Celebrations
                  </div>
                  <div className="text-[10px] text-serene-text-muted">Crown animation at 3, 7, 14-day milestones</div>
                </div>
                <button
                  onClick={() => updateSetting('pet', { ...(appData.settings.pet || {}), streakCelebrationsEnabled: !(appData.settings.pet?.streakCelebrationsEnabled !== false) })}
                  className={`w-10 h-5 shrink-0 rounded-full transition-colors relative ${
                    appData.settings.pet?.streakCelebrationsEnabled !== false ? 'bg-serene-primary' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-label="Toggle streak celebrations"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      appData.settings.pet?.streakCelebrationsEnabled !== false ? 'transform translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="space-y-2 pt-2 border-t border-serene-border-light dark:border-serene-border-dark">
            <h3 className="font-bold text-serene-text-primary dark:text-serene-text-darkPrimary flex items-center gap-1.5">
              <Command className="w-3.5 h-3.5 text-serene-primary dark:text-serene-primary-dark" />
              <span>Keyboard Shortcuts</span>
            </h3>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center justify-between p-2 bg-serene-surfaceAlt-light/40 dark:bg-serene-surfaceAlt-dark/40 rounded-lg">
                <span className="text-serene-text-secondary dark:text-serene-text-darkSecondary">Focus Search</span>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded font-mono text-[10px]">Ctrl+K</kbd>
              </div>
              <div className="flex items-center justify-between p-2 bg-serene-surfaceAlt-light/40 dark:bg-serene-surfaceAlt-dark/40 rounded-lg">
                <span className="text-serene-text-secondary dark:text-serene-text-darkSecondary">Quick Add Link</span>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded font-mono text-[10px]">Ctrl+N</kbd>
              </div>
              <div className="flex items-center justify-between p-2 bg-serene-surfaceAlt-light/40 dark:bg-serene-surfaceAlt-dark/40 rounded-lg">
                <span className="text-serene-text-secondary dark:text-serene-text-darkSecondary">Reject / Show Next</span>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded font-mono text-[10px]">Ctrl+R</kbd>
              </div>
              <div className="flex items-center justify-between p-2 bg-serene-surfaceAlt-light/40 dark:bg-serene-surfaceAlt-dark/40 rounded-lg">
                <span className="text-serene-text-secondary dark:text-serene-text-darkSecondary">Toggle Scratchpad</span>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded font-mono text-[10px]">Ctrl+Q</kbd>
              </div>
            </div>
          </div>

          {/* Danger Zone: Clear All Data */}
          <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-1.5 text-xs">
                <Trash className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Clear All Data</span>
              </div>
              <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">
                Permanently delete all tasks, bookmarks, reflections, and history from local storage and cloud. Account stays signed in.
              </div>
            </div>
            <button
              type="button"
              onClick={handleClearAllDataConfirm}
              disabled={isClearingData}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors text-xs shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Trash className="w-3.5 h-3.5" />
              <span>{isClearingData ? 'Clearing...' : 'Clear All Data'}</span>
            </button>
          </div>
        </div>

      </div>
    {confettiPreview && <ConfettiOverlay key={confettiPreview.key} style={confettiPreview.style} />}
    <MascotShowcaseModal
      isOpen={isMascotShowcaseOpen}
      onClose={() => setIsMascotShowcaseOpen(false)}
    />
  </>
);
};
