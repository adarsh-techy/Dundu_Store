import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Smartphone, RefreshCw, CheckCircle, XCircle, Zap } from 'lucide-react';
import { settingsApi } from '../api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';

function Toggle({ enabled, onChange, loading }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={loading}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        enabled ? 'bg-green-500' : 'bg-gray-300'
      } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <span
        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function AppUpdate() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-settings'], queryFn: settingsApi.get });
  const settings = data?.data?.settings || {};

  const [saving, setSaving] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [form, setForm] = useState({
    update_message: '',
    latest_version: '',
  });

  if (!isLoading && !hydrated && data) {
    setForm({
      update_message: settings.update_message || 'A new version of Dundu is available. Please update the app for the best experience.',
      latest_version: settings.latest_version || '1.0.0',
    });
    setHydrated(true);
  }

  const updateAvailable = settings.update_available === 'true';

  async function handleSendNow() {
    setSaving('send');
    try {
      await settingsApi.update({
        update_available: true,
        update_message: form.update_message,
      });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('✅ Update notification sent! Mobile app will show popup within 30 seconds.');
    } catch { toast.error('Failed to send'); }
    finally { setSaving(null); }
  }

  async function handleStopNotification() {
    setSaving('stop');
    try {
      await settingsApi.update({ update_available: false });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Update notification stopped');
    } catch { toast.error('Failed to stop'); }
    finally { setSaving(null); }
  }


  async function handleSaveMessage() {
    setSaving('message');
    try {
      await settingsApi.update({ update_message: form.update_message });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Update message saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(null); }
  }

  async function handleSaveVersion() {
    setSaving('version');
    try {
      await settingsApi.update({ latest_version: form.latest_version });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Latest version saved — users on older versions will see the popup');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(null); }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Smartphone className="h-6 w-6 text-indigo-500" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">App Update</h1>
          <p className="text-sm text-gray-500">Notify users when a new version is available</p>
        </div>
      </div>

      {/* ── Status banner ── */}
      <div className={`rounded-2xl p-4 border flex items-center gap-4 ${
        updateAvailable
          ? 'bg-green-50 border-green-300'
          : 'bg-gray-50 border-gray-200'
      }`}>
        {updateAvailable
          ? <CheckCircle className="h-8 w-8 text-green-500 shrink-0" />
          : <XCircle className="h-8 w-8 text-gray-400 shrink-0" />
        }
        <div className="flex-1">
          <p className={`font-semibold ${updateAvailable ? 'text-green-800' : 'text-gray-600'}`}>
            {updateAvailable ? '🔔 Update notification is LIVE' : 'No update notification active'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {updateAvailable
              ? 'Mobile app is polling every 30 seconds — users will see the popup very soon.'
              : 'Users will not see any update popup.'}
          </p>
        </div>
        {updateAvailable && (
          <button
            onClick={handleStopNotification}
            disabled={saving === 'stop'}
            className="text-xs font-semibold text-red-600 border border-red-300 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving === 'stop' ? 'Stopping...' : 'Stop'}
          </button>
        )}
      </div>

      {/* ── Send Now ── */}
      <section className="bg-blue-50 rounded-2xl border border-blue-300 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-bold text-pink-600">Send Update Notification</h2>
        </div>
        <p className="text-xs text-gray-500 -mt-2">
          Click the button below. The mobile app checks every <strong>30 seconds</strong> — users will see the popup without restarting the app.
        </p>

        {/* Message */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Update Message</label>
          <textarea
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            rows={3}
            value={form.update_message}
            onChange={(e) => setForm((p) => ({ ...p, update_message: e.target.value }))}
            placeholder="A new version of Dundu is available..."
          />
          <p className="text-xs text-gray-400">This message will appear in the popup on users' phones.</p>
        </div>

        {/* Big send button */}
        <button
          onClick={handleSendNow}
          disabled={saving === 'send' || updateAvailable}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-3 ${
            updateAvailable
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-500 to-pink-500 text-white hover:from-indigo-600 hover:to-pink-600 shadow-lg hover:shadow-xl active:scale-95'
          }`}
        >
          {saving === 'send' ? (
            <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Smartphone className="h-5 w-5" />
          )}
          {updateAvailable ? 'Notification already active' : 'Send Update Popup to All Users'}
        </button>
      </section>

      {/* ── Automatic version check ── */}
      <section className="bg-purple-50 rounded-2xl border border-purple-300 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-purple-500" />
          <h2 className="text-lg font-bold text-pink-600">Automatic Version Check</h2>
        </div>
        <p className="text-xs text-gray-500 -mt-2">
          Set the latest app version here. Users whose app version is older will automatically see the update popup — no need to turn on the manual toggle.
        </p>

        <div className="bg-white rounded-xl border border-purple-200 p-4 text-sm">
          <p className="font-medium text-gray-700 mb-1">How it works</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-500 text-xs">
            <li>You release a new version of the app (e.g., <strong>1.2.0</strong>)</li>
            <li>Set "Latest Version" below to <strong>1.2.0</strong></li>
            <li>Users still on <strong>1.0.0</strong> or <strong>1.1.x</strong> will see the update popup automatically</li>
            <li>Users already on <strong>1.2.0</strong> see nothing</li>
          </ol>
        </div>

        <div className="space-y-1">
          <Input
            label="Latest App Version"
            value={form.latest_version}
            onChange={(e) => setForm((p) => ({ ...p, latest_version: e.target.value }))}
            placeholder="1.0.0"
          />
          <p className="text-xs text-gray-400">Use semver format: major.minor.patch (e.g. 1.2.0)</p>
        </div>

        <div className="flex justify-end">
          <Button size="sm" loading={saving === 'version'} onClick={handleSaveVersion}>
            Save Latest Version
          </Button>
        </div>
      </section>

      <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4 text-xs text-yellow-800">
        <strong>Tip:</strong> After users update, turn off the manual toggle and keep the "Latest Version" up to date so users on the new version don't see the popup again.
      </div>
    </div>
  );
}
