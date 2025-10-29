'use client'

import { useState } from 'react'
import AdminSidebar from './AdminSidebar'
import SystemOverview from './SystemOverview'
import UserManagement from './UserManagement'
import ApiDebug from './ApiDebug'
import { SystemInitializer } from './SystemInitializer'
import RefreshSession from './RefreshSession'

type AdminView = 'overview' | 'users' | 'analytics' | 'settings' | 'api-debug'

export default function AdminDashboard() {
  const [activeView, setActiveView] = useState<AdminView>('overview')

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return <SystemOverview />
      case 'users':
        return <UserManagement />
      case 'analytics':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h1>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600">Analytics dashboard coming soon...</p>
            </div>
          </div>
        )
      case 'api-debug':
        return <ApiDebug />
      case 'settings':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Session Management</h3>
                <p className="text-sm text-gray-600 mb-4">
                  If you just upgraded to admin, refresh your session to apply the changes.
                </p>
                <RefreshSession />
              </div>
              <SystemInitializer />
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600">Additional system settings coming soon...</p>
              </div>
            </div>
          </div>
        )
      default:
        return <SystemOverview />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <AdminSidebar activeView={activeView} onViewChange={setActiveView} />
        <main className="flex-1 ml-64">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}