import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Gift, Users, Clock, CheckCircle } from 'lucide-react';
import { settingsApi } from '../../../api';
import client from '../../../api/client';
import StatCard from '../../../components/ui/StatCard';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import { anyChanged } from '../../../utils/dirty';
import toast from 'react-hot-toast';

const referralApi = {
  stats: () => client.get('/admin/referral/stats'),
  rewards: () => client.get('/admin/referral/rewards'),
};

export default function Referral() {
  const qc = useQueryClient();
  const [referrerPct, setReferrerPct] = useState('20');
  const [referredPct, setReferredPct] = useState('30');
  const [savingSettings, setSavingSettings] = useState(false);

  const { data: settingsData } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: settingsApi.get,
  });

  useEffect(() => {
    const s = settingsData?.data?.settings || {};
    if (s.referrer_discount_percent) setReferrerPct(String(s.referrer_discount_percent));
    if (s.referred_discount_percent) setReferredPct(String(s.referred_discount_percent));
  }, [settingsData]);

  const savedReferralSettings = settingsData?.data?.settings || {};
  const referralDirty = anyChanged(
    [referrerPct, savedReferralSettings.referrer_discount_percent ?? '20'],
    [referredPct, savedReferralSettings.referred_discount_percent ?? '30']
  );

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-referral-stats'],
    queryFn: referralApi.stats,
  });
  const stats = statsData?.data || {};

  const { data: rewardsData, isLoading: rewardsLoading } = useQuery({
    queryKey: ['admin-referral-rewards'],
    queryFn: referralApi.rewards,
  });
  const rewards = rewardsData?.data?.rewards || [];

  const saveSettings = async () => {
    const referrer = parseInt(referrerPct);
    const referred = parseInt(referredPct);
    if (!referrer || referrer < 1 || referrer > 100) return toast.error('Referrer discount must be 1–100');
    if (!referred || referred < 1 || referred > 100) return toast.error('Referred discount must be 1–100');
    setSavingSettings(true);
    try {
      await settingsApi.update({ referrer_discount_percent: referrer, referred_discount_percent: referred });
      qc.invalidateQueries(['admin-settings']);
      toast.success('Referral settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Referral Program</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage referral discounts and track rewards</p>
      </div>

      {/* Settings card */}
      <div className="bg-pink-100/30 rounded-2xl border border-pink-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="h-4 w-4 text-indigo-500" />
          <h2 className="text-sm font-bold text-gray-800">Referral Discount Settings</h2>
        </div>
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <label className="text-sm font-bold text-green-600 uppercase tracking-wide block mb-1.5">
              Referrer Discount %
            </label>
            <p className="text-xs text-gray-400 mb-2">Person who shared the code gets this % off next purchase</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={100}
                value={referrerPct}
                onChange={(e) => setReferrerPct(e.target.value)}
                className="w-24 border border-gray-400 rounded-xl px-3 py-2 text-md focus:outline-none focus:border-indigo-400 text-pink-600 font-bold"
                placeholder="20"
              />
              <span className="text-lg text-gray-900">%</span>
            </div>
          </div>
          <div>
            <label className="text-sm font-bold text-orange-600 uppercase tracking-wide block mb-1.5">
              Referred Discount %
            </label>
            <p className="text-xs text-gray-400 mb-2">New user who used a referral code gets this % off first purchase</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={100}
                value={referredPct}
                onChange={(e) => setReferredPct(e.target.value)}
                className="w-24 border border-gray-400 rounded-xl px-3 py-2 text-md focus:outline-none focus:border-indigo-400 text-pink-600 font-bold"
                placeholder="30"
              />
              <span className="text-md text-gray-900">%</span>
            </div>
          </div>
          {referralDirty && (
            <Button size="sm" onClick={saveSettings} loading={savingSettings}>Save</Button>
          )}
        </div>
      </div>

      {/* Stats row */}
      {statsLoading ? <Spinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Total Referrals"
            value={stats.total_referrals ?? 0}
            icon={Users}
            color="indigo"
            sub="Users who signed up via a referral code"
          />
          <StatCard
            title="Pending Rewards"
            value={stats.pending_rewards ?? 0}
            icon={Clock}
            color="rose"
            sub="Unused referral rewards"
          />
          <StatCard
            title="Used Rewards"
            value={stats.used_rewards ?? 0}
            icon={CheckCircle}
            color="green"
            sub="Rewards already applied to orders"
          />
        </div>
      )}

      {/* Rewards table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800">Reward History</h2>
          <p className="text-xs text-gray-400 mt-0.5">All referral rewards issued to users</p>
        </div>
        {rewardsLoading ? (
          <div className="p-8"><Spinner /></div>
        ) : rewards.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Gift className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No referral rewards yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left font-medium">User</th>
                  <th className="px-5 py-3 text-left font-medium">Reward Type</th>
                  <th className="px-5 py-3 text-left font-medium">Discount %</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Order #</th>
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rewards.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{r.user_name || '—'}</p>
                      <p className="text-xs text-gray-400">{r.user_email || '—'}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        r.reward_type === 'referrer'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {r.reward_type === 'referrer' ? 'Referrer' : 'Referred'}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">{r.discount_percent}%</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        r.is_used
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {r.is_used ? 'Used' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 font-mono text-xs">{r.order_number || '—'}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
