/**
 * Sidebar — responsive collapsible navigation.
 *
 * Desktop: fixed 240px wide sidebar.
 * Mobile:  slides in as an overlay when toggled from the Topbar.
 *
 * Props:
 *   open       — boolean (mobile overlay open state)
 *   onClose    — callback to close the overlay on mobile
 */

import { NavLink, useLocation } from 'react-router-dom'
import {
  FiShield, FiGrid, FiList, FiBell, FiFileText,
  FiSettings, FiChevronRight,
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard',  icon: FiGrid      },
  { to: '/logs',      label: 'Log Viewer', icon: FiList      },
  { to: '/alerts',    label: 'Alerts',     icon: FiBell      },
  { to: '/reports',   label: 'Reports',    icon: FiFileText  },
  { to: '/settings',  label: 'Settings',   icon: FiSettings  },
]

/* ── Nav link item ───────────────────────────────────────────────────────── */
function NavItem({ to, label, icon: Icon, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
         transition-all duration-200 group relative
         ${isActive
           ? 'bg-sky-500/15 text-sky-300 border border-sky-500/20'
           : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
         }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
          {label}
          {isActive && (
            <FiChevronRight className="w-3 h-3 ml-auto text-sky-400 opacity-60" />
          )}
        </>
      )}
    </NavLink>
  )
}

/* ── Sidebar ─────────────────────────────────────────────────────────────── */
export default function Sidebar({ open, onClose }) {
  const { user, isAdmin } = useAuth()

  const sidebarContent = (
    <div className="flex flex-col h-full">

      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
            <FiShield className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">LogSec</p>
            <p className="text-xs text-slate-500 mt-0.5">Monitor</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest px-3 mb-2">
          Navigation
        </p>
        {NAV_ITEMS.map((item) => (
          // Hide settings from non-admin on mobile; still accessible directly
          <NavItem key={item.to} {...item} onClick={onClose} />
        ))}
      </nav>

      {/* User info footer */}
      <div className="px-3 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04]">
          {/* Avatar initials */}
          <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-300 text-xs font-bold uppercase shrink-0">
            {user?.username?.[0] ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{user?.username}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
          </div>
          {isAdmin && (
            <span className="ml-auto text-xs bg-sky-500/20 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded font-medium shrink-0">
              Admin
            </span>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-cyber-surface border-r border-white/5 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Drawer */}
          <aside className="fixed inset-y-0 left-0 z-50 w-60 bg-cyber-surface border-r border-white/5 flex flex-col lg:hidden animate-slide-in">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}

