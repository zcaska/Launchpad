import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Download, 
  Upload, 
  RotateCcw, 
  ShieldCheck, 
  Copy, 
  Check, 
  Sliders, 
  Command,
  Clock,
  Zap,
  Key,
  BarChart2
} from 'lucide-react';
import { AppData } from '../../types';
import { exportDataAsJson, importDataFromJson } from '../../utils/storage';
import { DEFAULT_INITIAL_PREFERENCES } from '../../data/seedData';
import { modalBackdropVariants, modalContentVariants } from '../../utils/motion';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appData: AppData;
  onUpdateAppData: (data: AppData) => void;
  onResetData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  appData,
  onUpdateAppData,
  onResetData,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
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
        const imported = importDataFromJson(text);
        onUpdateAppData(imported);
        alert('Data successfully imported and restored!');
      } catch (err: any) {
        alert('Failed to import backup file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleResetConfirm = () => {
    if (confirm('Are you sure you want to reset all data back to initial defaults? Any unsaved custom links will be replaced.')) {
      onResetData();
      onClose();
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs" 
            variants={modalBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose} 
          />
          <motion.div 
            role="dialog"
            aria-modal="true"
            variants={modalContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="relative w-full max-w-2xl bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-2xl shadow-modal overflow-hidden z-10 flex flex-col max-h-[90vh]"
          >
        {/* Header */}
        <div className="p-4 border-b border-serene-border-light dark:border-serene-border-dark flex items-center justify-between bg-serene-surfaceAlt-light/40 dark:bg-serene-surfaceAlt-dark/40">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-serene-primary-soft dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark">
              <Sliders className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
              LaunchPad Settings & AI Configuration
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-serene-text-muted hover:text-serene-text-primary dark:hover:text-serene-text-darkPrimary rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1 text-xs">
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
                className="flex-1 bg-white dark:bg-serene-surface-dark px-3 py-1.5 rounded-lg border border-serene-border-light dark:border-serene-border-dark font-mono text-[11px] text-serene-text-primary dark:text-serene-text-darkPrimary select-all"
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
                    Fetch AI web ideas when your local bookmark library is exhausted.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => updateOpenRouter('enabled', !appData.settings.openRouter.enabled)}
                className={`w-10 h-5 rounded-full transition-colors relative ${
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

          {/* Data Backup & Restore */}
          <div className="space-y-3">
            <h3 className="font-bold text-serene-text-primary dark:text-serene-text-darkPrimary flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-serene-primary dark:text-serene-primary-dark" />
              <span>Data Backup & Portability</span>
            </h3>

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
                  className={`w-10 h-5 rounded-full transition-colors relative ${
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
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded font-mono text-[10px]">N</kbd>
              </div>
              <div className="flex items-center justify-between p-2 bg-serene-surfaceAlt-light/40 dark:bg-serene-surfaceAlt-dark/40 rounded-lg">
                <span className="text-serene-text-secondary dark:text-serene-text-darkSecondary">Reject / Show Next</span>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded font-mono text-[10px]">R</kbd>
              </div>
              <div className="flex items-center justify-between p-2 bg-serene-surfaceAlt-light/40 dark:bg-serene-surfaceAlt-dark/40 rounded-lg">
                <span className="text-serene-text-secondary dark:text-serene-text-darkSecondary">Toggle Scratchpad</span>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded font-mono text-[10px]">Q</kbd>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 flex items-center justify-between">
            <div>
              <div className="font-semibold text-rose-800 dark:text-rose-300">Reset Default Seed Data</div>
              <div className="text-[10px] text-rose-600 dark:text-rose-400">Restore fresh default folders & sample links</div>
            </div>
            <button
              onClick={handleResetConfirm}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-serene-border-light dark:border-serene-border-dark flex justify-end bg-serene-surfaceAlt-light/40 dark:bg-serene-surfaceAlt-dark/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-serene-primary hover:bg-serene-primary-hover text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            Close Settings
          </button>
        </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
