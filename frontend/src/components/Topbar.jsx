/**
 * Topbar — fixed top navigation bar.
 *
 * Features:
 *  - Hamburger toggle for the mobile sidebar
 *  - Current page title derived from route
 *  - User avatar + dropdown (logout)
 *  - Real-time WS status indicator
 */

import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  FiMenu, FiLogOut, FiUser, FiChevronDown, FiShield,
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'

/* ── Route → page title map ──────────────────────────────────────────────── */
const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/logs':      'Log Viewer',
  '/alerts':    'Alerts',
  '/reports':   'Reports',
  '/settings':  'Settings',
}

/* ── User dropdown ───────────────────────────────────────────────────────── */
function UserMenu({ user, isAdmin, onLogout }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/[0.06] transition-colors"
        aria-expanded={open}
        aria-label="User menu"
      >
        <div className="w-7 h-7 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-300 text-xs font-bold uppercase">
          {user?.username?.[0] ?? '?'}
        </div>
        <span className="text-sm font-medium text-slate-300 hidden sm:block">{user?.username}</span>
        <FiChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-full mt-2 w-48 z-20 glass-card border border-white/10 shadow-glass py-1 rounded-xl overflow-hidden">
            {/* Profile info */}
            <div className="px-4 py-2.5 border-b border-white/5">
              <p className="text-sm font-medium text-white">{user?.username}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.email}</p>
              {isAdmin && (
                <span className="inline-block mt-1 text-xs bg-sky-500/20 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded">
                  Admin
                </span>
              )}
            </div>

            {/* Logout */}
            <button
              onClick={() => { setOpen(false); onLogout() }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:text-rose-400 hover:bg-rose-500/5 transition-colors"
            >
              <FiLogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Topbar ──────────────────────────────────────────────────────────────── */
export default function Topbar({ onMenuToggle }) {
  const { user, isAdmin, logout } = useAuth()
  const location = useLocation()

  const pageTitle = PAGE_TITLES[location.pathname] || 'Log Security Monitor'

  return (
    <header className="h-14 bg-cyber-surface/80 backdrop-blur-md border-b border-white/5 flex items-center px-4 gap-4 sticky top-0 z-30">

      {/* Mobile hamburger */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors"
        aria-label="Toggle navigation menu"
      >
        <FiMenu className="w-5 h-5" />
      </button>

      {/* Page title */}
      <div className="flex items-center gap-2 flex-1">
        <FiShield className="w-4 h-4 text-sky-400 hidden sm:block" />
        <h2 className="text-sm font-semibold text-white">{pageTitle}</h2>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        <UserMenu user={user} isAdmin={isAdmin} onLogout={logout} />
      </div>
    </header>
  )
}

