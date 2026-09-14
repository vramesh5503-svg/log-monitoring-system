/**
 * SettingsPage — monitoring control + log file upload + alert configuration.
 *
 * Sections:
 *  1. Monitor Control — start / stop watching a log file
 *  2. Upload Log File — drag & drop or click to upload
 *  3. Alert Threshold (display only; backend config via .env)
 *  4. Email Configuration info panel
 */

import { useState, useRef } from 'react'
import {
  FiPlay, FiSquare, FiUpload, FiSettings, FiMail,
  FiAlertTriangle, FiCheckCircle, FiFolder,
} from 'react-icons/fi'
import toast from 'react-hot-toast'

import { useMonitor }  from '../hooks/useMonitor'
import { useAuth }     from '../context/AuthContext'
import LoadingSpinner  from '../components/LoadingSpinner'

/* ── Section wrapper ─────────────────────────────────────────────────────── */
function Section({ title, icon: Icon, children }) {
  return (
    <div className="glass-card p-6">
      <h2 className="section-title flex items-center gap-2 mb-5">
        <Icon className="text-sky-400 w-5 h-5" /> {title}
      </h2>
      {children}
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function SettingsPage() {
  const { isAdmin } = useAuth()
  const {
    status, loading, uploading, uploadProgress,
    startMonitoring, stopMonitoring, uploadLogFile,
  } = useMonitor()

  const [watchPath, setWatchPath] = useState('')
  const [dragOver,  setDragOver]  = useState(false)
  const fileRef = useRef(null)

  /* ── Start monitoring ──────────────────────────────────────────────────── */
  const handleStart = async () => {
    if (!watchPath.trim()) {
      toast.error('Enter a log file path to watch.')
      return
    }
    await startMonitoring({ watch_path: watchPath.trim(), alert_threshold: 5 })
  }

  /* ── File upload ───────────────────────────────────────────────────────── */
  const handleFile = (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['log', 'txt', 'csv'].includes(ext)) {
      toast.error('Only .log, .txt, and .csv files are accepted.')
      return
    }
    uploadLogFile(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FiSettings className="text-sky-400" /> Settings
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">Configure monitoring, uploads, and alerts</p>
      </div>

      {/* ── 1. Monitor Control ─────────────────────────────────────────── */}
      <Section title="Monitor Control" icon={FiPlay}>
        {/* Status indicator */}
        <div className={`flex items-center gap-2 mb-5 px-4 py-3 rounded-lg border ${
          status.is_running
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
        }`}>
          <span className={`w-2 h-2 rounded-full ${status.is_running ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          {status.is_running
            ? <>Monitoring active: <code className="font-mono text-xs ml-1">{status.watch_path}</code></>
            : 'Monitoring is stopped.'
          }
        </div>

        {!status.is_running ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="watch-path">
                Log File Path (server-side absolute path)
              </label>
              <div className="relative">
                <FiFolder className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  id="watch-path"
                  type="text"
                  placeholder="/var/log/auth.log"
                  value={watchPath}
                  onChange={(e) => setWatchPath(e.target.value)}
                  className="input-field pl-9"
                  disabled={!isAdmin}
                />
              </div>
            </div>
            <button
              onClick={handleStart}
              disabled={loading || !isAdmin}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? <LoadingSpinner size="sm" /> : <FiPlay className="w-4 h-4" />}
              Start Monitoring
            </button>
            {!isAdmin && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <FiAlertTriangle className="w-3 h-3" /> Admin role required.
              </p>
            )}
          </div>
        ) : (
          <button
            onClick={stopMonitoring}
            disabled={loading || !isAdmin}
            className="btn-danger flex items-center gap-2"
          >
            {loading ? <LoadingSpinner size="sm" /> : <FiSquare className="w-4 h-4" />}
            Stop Monitoring
          </button>
        )}
      </Section>

      {/* ── 2. Upload Log File ─────────────────────────────────────────── */}
      <Section title="Upload Log File" icon={FiUpload}>
        <p className="text-sm text-slate-400 mb-4">
          Upload a log file to run all detection rules against it immediately.
          Accepts <code className="text-sky-400">.log</code>, <code className="text-sky-400">.txt</code>, and{' '}
          <code className="text-sky-400">.csv</code> files (max 50 MB).
        </p>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200
            ${dragOver
              ? 'border-sky-400 bg-sky-500/5'
              : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
            }
          `}
          role="button"
          aria-label="Upload log file"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <LoadingSpinner size="lg" />
              <p className="text-sm text-slate-400">Uploading & scanning… {uploadProgress}%</p>
              {/* Progress bar */}
              <div className="w-full max-w-xs bg-slate-700 rounded-full h-1.5">
                <div
                  className="bg-sky-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <FiUpload className="w-10 h-10 text-slate-500" />
              <p className="text-sm text-slate-400">
                <span className="text-sky-400 font-medium">Click to upload</span> or drag & drop
              </p>
              <p className="text-xs text-slate-600">.log · .txt · .csv · max 50 MB</p>
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".log,.txt,.csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
          disabled={uploading}
        />
      </Section>

      {/* ── 3. Alert Threshold info ────────────────────────────────────── */}
      <Section title="Alert Configuration" icon={FiAlertTriangle}>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Brute Force Threshold</p>
            <p className="text-2xl font-bold text-yellow-300">5</p>
            <p className="text-xs text-slate-500 mt-1">failed attempts trigger alert</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Detection Window</p>
            <p className="text-2xl font-bold text-sky-300">300s</p>
            <p className="text-xs text-slate-500 mt-1">sliding time window</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
          <FiCheckCircle className="w-3 h-3 text-emerald-400" />
          Thresholds are configured in the backend <code>.env</code> file.
        </p>
      </Section>

      {/* ── 4. Email alerts info ───────────────────────────────────────── */}
      <Section title="Email Alerts" icon={FiMail}>
        <p className="text-sm text-slate-400 mb-3">
          The system sends email notifications for HIGH and CRITICAL alerts when SMTP is configured.
        </p>
        <div className="bg-black/20 rounded-lg p-4 font-mono text-xs text-slate-400 space-y-1">
          <p><span className="text-sky-400">EMAIL_HOST</span>=smtp.gmail.com</p>
          <p><span className="text-sky-400">EMAIL_PORT</span>=587</p>
          <p><span className="text-sky-400">EMAIL_USER</span>=your-email@gmail.com</p>
          <p><span className="text-sky-400">EMAIL_PASSWORD</span>=your-app-password</p>
        </div>
        <p className="text-xs text-slate-500 mt-3">Set these in <code className="text-sky-400">backend/.env</code> and restart the server.</p>
      </Section>

    </div>
  )
}

