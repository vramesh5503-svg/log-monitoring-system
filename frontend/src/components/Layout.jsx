/**
 * Layout — shell component wrapping all protected pages.
 *
 * Structure:
 *   ┌──────────┬─────────────────────┐
 *   │          │  Topbar             │
 *   │ Sidebar  ├─────────────────────┤
 *   │          │  <Outlet />         │
 *   │          │  (page content)     │
 *   └──────────┴─────────────────────┘
 */

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar  from './Topbar'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-cyber-bg overflow-hidden">
      {/* Sidebar — sticky on desktop, overlay on mobile */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onMenuToggle={() => setSidebarOpen((v) => !v)} />

        {/* Scrollable page body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

