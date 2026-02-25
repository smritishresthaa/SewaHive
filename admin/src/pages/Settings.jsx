import React from 'react'

export default function Settings() {
  const PageSection = ({ title, icon, description, children }) => (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
        <span>{icon}</span>
        {title}
      </h3>
      <p className="text-gray-600 text-sm mb-6">{description}</p>
      {children}
    </div>
  )

  const SettingToggle = ({ label, description, enabled }) => (
    <div className="flex items-center justify-between p-4 border-b last:border-b-0">
      <div className="flex-1">
        <p className="font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-600 mt-1">{description}</p>
      </div>
      <input 
        type="checkbox" 
        defaultChecked={enabled}
        className="w-5 h-5 text-brand-600 rounded cursor-pointer"
      />
    </div>
  )

  return (
    <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">System Settings</h1>

        <PageSection 
          icon="📋" 
          title="Platform Rules"
          description="Configure platform policies and terms"
        >
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-900 mb-3">Terms & Conditions</label>
              <textarea 
                className="w-full border rounded p-3 text-sm"
                rows="4"
                defaultValue="Our platform provides service-based connections between clients and providers..."
              ></textarea>
              <button className="mt-3 bg-brand-600 text-white px-4 py-2 rounded hover:bg-brand-700 text-sm font-semibold">
                Save Changes
              </button>
            </div>

            <div className="border rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-900 mb-3">Service Fee Policy</label>
              <p className="text-sm text-gray-700 mb-3">Platform Commission: 15% per booking</p>
              <input 
                type="number" 
                defaultValue="15" 
                className="w-full border rounded p-2 text-sm"
                placeholder="Commission percentage"
              />
              <button className="mt-3 w-full bg-brand-600 text-white py-2 rounded hover:bg-brand-700 text-sm font-semibold">
                Update Commission Rate
              </button>
            </div>
          </div>
        </PageSection>

        <PageSection 
          icon="🔔" 
          title="Notification Settings"
          description="Control platform notifications and alerts"
        >
          <div className="border rounded-lg overflow-hidden">
            <SettingToggle 
              label="Email Notifications" 
              description="Send email alerts for important events"
              enabled={true}
            />
            <SettingToggle 
              label="SMS Alerts" 
              description="Send SMS for emergency situations"
              enabled={true}
            />
            <SettingToggle 
              label="In-App Notifications" 
              description="Show notifications in the app"
              enabled={true}
            />
            <SettingToggle 
              label="Marketing Emails" 
              description="Send promotional content to users"
              enabled={false}
            />
          </div>
        </PageSection>

        <PageSection 
          icon="👥" 
          title="Roles & Permissions"
          description="Manage admin roles and access levels"
        >
          <div className="space-y-3">
            {[
              { role: 'Super Admin', permissions: 'All access', color: 'red' },
              { role: 'Content Moderator', permissions: 'Reviews, complaints, content', color: 'blue' },
              { role: 'Finance Manager', permissions: 'Payments, refunds, commission', color: 'green' },
            ].map((item, idx) => (
              <div key={idx} className={`border rounded-lg p-4`}>
                <p className={`font-semibold`}>{item.role}</p>
                <p className={`text-xs mt-1`}>{item.permissions}</p>
              </div>
            ))}
          </div>
        </PageSection>

        <PageSection 
          icon="📄" 
          title="Content Management"
          description="Manage pages, FAQs, and help content"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4 text-center">
              <p className="text-3xl">📝</p>
              <p className="font-semibold text-gray-900 mt-2">Help Center</p>
              <p className="text-xs text-gray-600 mt-1">Manage FAQ and help articles</p>
              <button className="mt-3 w-full bg-brand-600 text-white py-2 rounded text-sm hover:bg-brand-700">
                Edit Content
              </button>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <p className="text-3xl">📰</p>
              <p className="font-semibold text-gray-900 mt-2">Blog Posts</p>
              <p className="text-xs text-gray-600 mt-1">Publish platform updates</p>
              <button className="mt-3 w-full bg-brand-600 text-white py-2 rounded text-sm hover:bg-brand-700">
                Manage Blog
              </button>
            </div>
          </div>
        </PageSection>

        <PageSection 
          icon="🔒" 
          title="Security Settings"
          description="Configure security policies and protocols"
        >
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-green-50">
              <p className="font-semibold text-green-900">🔐 SSL Certificate</p>
              <p className="text-sm text-green-700 mt-2">✓ Active and valid (Expires: 2026-06-15)</p>
            </div>
            <div className="border rounded-lg p-4 bg-blue-50">
              <p className="font-semibold text-blue-900">🛡️ Two-Factor Authentication</p>
              <button className="mt-3 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                Enable for All Admins
              </button>
            </div>
            <div className="border rounded-lg p-4 bg-purple-50">
              <p className="font-semibold text-purple-900">🔑 API Keys</p>
              <p className="text-sm text-purple-700 mt-2">Manage third-party integrations</p>
              <button className="mt-3 bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700">
                View API Keys
              </button>
            </div>
          </div>
        </PageSection>
    </div>
  )
}
