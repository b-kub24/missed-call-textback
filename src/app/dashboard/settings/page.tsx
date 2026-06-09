'use client';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    businessName: '',
    defaultMessage: 'Thanks for calling! We missed your call but will get back to you shortly.',
    responseDelay: 30,
    activeHoursStart: '08:00',
    activeHoursEnd: '20:00',
    enableWeekends: false,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await fetch('/api/dashboard', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    setSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="space-y-6 bg-white p-6 rounded-xl shadow">
        <div>
          <label className="block text-sm font-medium mb-1">Business Name</label>
          <input type="text" value={settings.businessName} onChange={e => setSettings({...settings, businessName: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Default Auto-Reply Message</label>
          <textarea value={settings.defaultMessage} onChange={e => setSettings({...settings, defaultMessage: e.target.value})} rows={3} className="w-full px-4 py-2 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Response Delay (seconds)</label>
          <input type="number" value={settings.responseDelay} onChange={e => setSettings({...settings, responseDelay: parseInt(e.target.value)})} className="w-full px-4 py-2 border rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Active Hours Start</label>
            <input type="time" value={settings.activeHoursStart} onChange={e => setSettings({...settings, activeHoursStart: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Active Hours End</label>
            <input type="time" value={settings.activeHoursEnd} onChange={e => setSettings({...settings, activeHoursEnd: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={settings.enableWeekends} onChange={e => setSettings({...settings, enableWeekends: e.target.checked})} />
          <label className="text-sm">Enable auto-reply on weekends</label>
        </div>
        <button onClick={handleSave} disabled={saving} className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
