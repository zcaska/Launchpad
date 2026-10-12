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
  BarChart2,
  BookmarkCheck,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AppData, GoogleCalendarConfig } from '../../types';
import { exportDataAsJson, importDataFromJson } from '../../utils/storage';
import { exportNetscapeBookmarks } from '../../utils/bookmarkParser';
import { DEFAULT_INITIAL_PREFERENCES } from '../../data/seedData';
import { modalBackdropVariants, modalContentVariants } from '../../utils/motion';
import { 
  requestGoogleAccessToken, 
  revokeGoogleAuthorization, 
  isGoogleTokenExpired,
  fetchGoogleCalendarAccountEmail
} from '../../services/googleCalendarService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appData: AppData;
  onUpdateAppData: (data: AppData) => void;
  onResetData: () => void;
  onOpenBookmarkImport?: () => void;
  onSyncCalendar?: () => Promise<void>;
  isSyncingCalendar?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  appData,
  onUpdateAppData,
  onResetData,
  onOpenBookmarkImport,
  onSyncCalendar,
  isSyncingCalendar = false,
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

  const handleExportBookmarksHtml = () => {
    const html = exportNetscapeBookmarks(appData.links, appData.folders);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `launchpad-bookmarks-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  const [isConnectingGCal, setIsConnectingGCal] = useState(false);
  const [gcalError, setGcalError] = useState<string | null>(null);
  const [gcalSuccessMsg, setGcalSuccessMsg] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const gcalConfig: GoogleCalendarConfig = appData.settings.googleCalendar || {
    enabled: false,
    clientId: '',
    calendarId: 'primary',
    syncIntervalMinutes: 5,
  };

  const updateGoogleCalendar = (key: keyof GoogleCalendarConfig, value: any) => {
    onUpdateAppData({
      ...appData,
      settings: {
        ...appData.settings,
        googleCalendar: {
          ...gcalConfig,
          [key]: value,
        },
      },
    });
  };

  const handleConnectCalendar = async (promptMode: string = '') => {
    const clientId = gcalConfig.clientId?.trim();
    if (!clientId) {
      setGcalError('Please enter your Google OAuth Client ID before connecting.');
      return;
    }

    try {
      setIsConnectingGCal(true);
      setGcalError(null);
      setGcalSuccessMsg(null);
      // When explicitly choosing to switch account, skip login_hint; otherwise pass existing email to bypass account picker
      const loginHint = promptMode === 'select_account' ? undefined : gcalConfig.userEmail;
      const token = await requestGoogleAccessToken(clientId, promptMode, loginHint);
      const userEmail = (await fetchGoogleCalendarAccountEmail(token, gcalConfig.calendarId || 'primary')) || gcalConfig.userEmail;
      onUpdateAppData({
        ...appData,
        settings: {
          ...appData.settings,
          googleCalendar: {
            ...gcalConfig,
            enabled: true,
            clientId,
            ...(userEmail ? { userEmail } : {}),
          },
        },
      });
      setGcalSuccessMsg(`Connected successfully! Calendar access granted${userEmail ? ` (${userEmail})` : ''}.`);
      if (onSyncCalendar) {
        await onSyncCalendar();
      }
    } catch (err: any) {
      setGcalError(err.message || 'Failed to authorize with Google Calendar');
    } finally {
      setIsConnectingGCal(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    if (confirm('Disconnect Google Calendar? This will revoke in-memory authorization and remove cached events.')) {
      try {
        await revokeGoogleAuthorization();
      } catch {
        // ignore revoke error
      }
      onUpdateAppData({
        ...appData,
        calendarEvents: [],
        settings: {
          ...appData.settings,
          googleCalendar: {
            ...gcalConfig,
            enabled: false,
            userEmail: undefined,
          },
        },
      });
      setGcalSuccessMsg('Disconnected. Calendar authorization revoked.');
      setGcalError(null);
    }
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

          {/* Google Calendar Integration (Read-Only) */}
          <div className="p-4 bg-serene-surfaceAlt-light/50 dark:bg-serene-surfaceAlt-dark/50 rounded-xl border border-serene-border-light dark:border-serene-border-dark space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-serene-text-primary dark:text-serene-text-darkPrimary">
                <Calendar className="w-3.5 h-3.5 text-serene-primary dark:text-serene-primary-dark" />
                <span>Google Calendar Integration</span>
              </div>
              <div className="flex items-center gap-1.5">
                {gcalConfig.enabled && !isGoogleTokenExpired() ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Connected & Active</span>
                  </span>
                ) : gcalConfig.enabled && isGoogleTokenExpired() ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                    <AlertCircle className="w-3 h-3" />
                    <span>Token Expired (Re-authorize)</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                    Disconnected
                  </span>
                )}
              </div>
            </div>

            <p className="text-[11px] text-serene-text-secondary dark:text-serene-text-darkSecondary leading-relaxed">
              Sync today's schedule into Time Radar to dynamically deduct busy meetings from your focus hours. Strictly read-only, zero backend, $0 cost, and access tokens are stored in-memory only.
            </p>

            {/* Error or Success notification */}
            {gcalError && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-[11px] text-rose-700 dark:text-rose-300">
                {gcalError}
              </div>
            )}
            {gcalSuccessMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-[11px] text-emerald-700 dark:text-emerald-300">
                {gcalSuccessMsg}
              </div>
            )}

            {/* Setup Guide Collapsible */}
            <div className="rounded-lg border border-serene-border-light dark:border-serene-border-dark overflow-hidden bg-white dark:bg-serene-surface-dark">
              <button
                type="button"
                onClick={() => setIsGuideOpen(!isGuideOpen)}
                className="w-full px-3 py-2 flex items-center justify-between text-[11px] font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary hover:bg-serene-surfaceAlt-light/40 dark:hover:bg-serene-surfaceAlt-dark/40 transition-colors"
              >
                <span>How to get a free Google OAuth Client ID (3 mins)</span>
                {isGuideOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {isGuideOpen && (
                <div className="p-3 border-t border-serene-border-light dark:border-serene-border-dark text-[11px] space-y-2 text-serene-text-secondary dark:text-serene-text-darkSecondary leading-relaxed bg-serene-surfaceAlt-light/20 dark:bg-serene-surfaceAlt-dark/20">
                  <ol className="list-decimal list-inside space-y-1 pl-1">
                    <li>
                      Go to the{' '}
                      <a
                        href="https://console.cloud.google.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-serene-primary hover:underline font-semibold inline-flex items-center gap-0.5"
                      >
                        Google Cloud Console <ExternalLink className="w-2.5 h-2.5" />
                      </a>{' '}
                      and create or select a project.
                    </li>
                    <li>Navigate to <strong>APIs & Services</strong> &gt; <strong>Library</strong>, search for <strong>Google Calendar API</strong>, and click <strong>Enable</strong>.</li>
                    <li>Go to <strong>APIs & Services</strong> &gt; <strong>Credentials</strong> &gt; <strong>Create Credentials</strong> &gt; <strong>OAuth client ID</strong>.</li>
                    <li>Select <strong>Web application</strong> as the type.</li>
                    <li>
                      Under <strong>Authorized JavaScript origins</strong>, add:
                      <div className="my-1 p-1.5 rounded bg-black/5 dark:bg-white/5 font-mono text-[10px] break-all select-all">
                        {window.location.origin}
                      </div>
                      <span className="text-[10px] opacity-75">(also add <code className="font-mono">http://localhost:5173</code> if developing locally)</span>
                    </li>
                    <li>Copy your generated <strong>Client ID</strong> and paste it below.</li>
                  </ol>
                </div>
              )}
            </div>

            {/* Input field */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-serene-text-secondary dark:text-serene-text-darkSecondary">
                OAuth 2.0 Web Client ID
              </label>
              <input
                type="text"
                value={gcalConfig.clientId || ''}
                onChange={(e) => updateGoogleCalendar('clientId', e.target.value)}
                placeholder="1234567890-abcdefg.apps.googleusercontent.com"
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-serene-surface-dark rounded-lg border border-serene-border-light dark:border-serene-border-dark font-mono text-serene-text-primary dark:text-serene-text-darkPrimary"
              />
            </div>

            {/* Connected Account Status */}
            {gcalConfig.enabled && gcalConfig.userEmail && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-serene-text-secondary dark:text-serene-text-darkSecondary">
                    Connected Account: <strong className="font-semibold text-emerald-800 dark:text-emerald-300 font-mono text-[11px]">{gcalConfig.userEmail}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleConnectCalendar('select_account')}
                  disabled={isConnectingGCal}
                  className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors disabled:opacity-50"
                  title="Switch to another Google Account"
                >
                  Switch account
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="text-[10px] text-serene-text-muted">
                {gcalConfig.lastSyncedAt ? (
                  <span>Last synced: {new Date(gcalConfig.lastSyncedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                ) : (
                  <span>Auto-syncs while app is active</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {gcalConfig.enabled ? (
                  <>
                    {onSyncCalendar && (
                      <button
                        type="button"
                        onClick={onSyncCalendar}
                        disabled={isSyncingCalendar}
                        className="px-3 py-1.5 bg-white dark:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark hover:border-serene-primary/50 text-serene-text-primary dark:text-serene-text-darkPrimary rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCalendar ? 'animate-spin' : ''}`} />
                        <span>{isSyncingCalendar ? 'Syncing...' : 'Sync Now'}</span>
                      </button>
                    )}
                    {isGoogleTokenExpired() && (
                      <button
                        type="button"
                        onClick={() => handleConnectCalendar('')}
                        disabled={isConnectingGCal}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <span>{isConnectingGCal ? 'Reconnecting...' : 'Re-authorize'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleDisconnectCalendar}
                      className="px-3 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleConnectCalendar('')}
                    disabled={isConnectingGCal || !gcalConfig.clientId?.trim()}
                    className="px-3.5 py-1.5 bg-serene-primary hover:bg-serene-primary-hover text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{isConnectingGCal ? 'Connecting to Google...' : 'Connect Google Calendar'}</span>
                  </button>
                )}
              </div>
            </div>
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

              {onOpenBookmarkImport && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenBookmarkImport();
                  }}
                  className="p-3 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark hover:bg-white dark:hover:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-xl flex items-center gap-3 transition-all hover:border-serene-primary/40 group text-left"
                >
                  <div className="p-2 rounded-lg bg-serene-primary/10 dark:bg-serene-primary/20 text-serene-primary dark:text-serene-primary-dark">
                    <BookmarkCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
                      Import Browser Bookmarks
                    </div>
                    <div className="text-[10px] text-serene-text-muted">HTML file import with auto-categorization</div>
                  </div>
                </button>
              )}

              <button
                onClick={handleExportBookmarksHtml}
                className="p-3 bg-serene-surfaceAlt-light dark:bg-serene-surfaceAlt-dark hover:bg-white dark:hover:bg-serene-surface-dark border border-serene-border-light dark:border-serene-border-dark rounded-xl flex items-center gap-3 transition-all hover:border-serene-primary/40 group text-left"
              >
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-serene-text-primary dark:text-serene-text-darkPrimary">
                    Export Bookmarks (.html)
                  </div>
                  <div className="text-[10px] text-serene-text-muted">Standard Netscape format for any browser</div>
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
