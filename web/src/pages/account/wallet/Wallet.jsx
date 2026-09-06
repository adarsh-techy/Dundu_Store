import { useQuery } from '@tanstack/react-query';
import { Wallet as WalletIcon, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { walletApi } from '../../../api';
import { formatPrice } from '../../../utils/format';

const REASON_LABELS = {
  order_payment: 'Paid at checkout',
  order_refund: 'Order cancelled — refund',
  return_refund: 'Return refund',
  admin_credit: 'Credit from Dundu',
  admin_debit: 'Adjustment',
};

export default function Wallet() {
  const { data, isLoading } = useQuery({
    queryKey: ['wallet-page'],
    queryFn: () => walletApi.getTransactions({ limit: 50 }),
  });

  const balance = data?.data?.balance ?? 0;
  const transactions = data?.data?.transactions || [];

  return (
    <div className="max-w-lg mx-auto px-4 py-12 space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
          style={{ backgroundColor: '#1a0a12' }}>
          <WalletIcon className="h-8 w-8" style={{ color: '#e91e8c' }} />
        </div>
        <h1 className="text-3xl font-black tracking-wide" style={{ color: '#f5f5f5' }}>My Wallet</h1>
        <p className="mt-2 text-sm" style={{ color: '#666' }}>
          Refunds and credits land here — use it to pay for your next order
        </p>
      </div>

      <div className="rounded-2xl p-6 text-center"
        style={{ background: 'linear-gradient(135deg, #1a0a12 0%, #0d0d0d 100%)', border: '1px solid #3d1226' }}>
        <p className="text-xs uppercase tracking-widest" style={{ color: '#888' }}>Available Balance</p>
        <p className="text-4xl font-black mt-2" style={{ color: '#e91e8c' }}>
          {isLoading ? '…' : formatPrice(balance)}
        </p>
        <p className="text-xs mt-2" style={{ color: '#555' }}>Choose &quot;Pay with Wallet&quot; at checkout to use it</p>
      </div>

      <div>
        <h2 className="font-semibold mb-3" style={{ color: '#ddd' }}>Transaction History</h2>
        {isLoading ? (
          <p className="text-sm text-center py-8" style={{ color: '#666' }}>Loading…</p>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 rounded-2xl" style={{ border: '1px solid #2e2e2e', backgroundColor: '#1a1a1a' }}>
            <WalletIcon className="h-10 w-10 mx-auto mb-3" style={{ color: '#333' }} />
            <p style={{ color: '#888' }}>No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ backgroundColor: '#111', border: '1px solid #2e2e2e' }}>
                <div className="flex items-center gap-3">
                  {t.type === 'credit'
                    ? <ArrowUpCircle className="h-5 w-5 shrink-0" style={{ color: '#22c55e' }} />
                    : <ArrowDownCircle className="h-5 w-5 shrink-0" style={{ color: '#e91e8c' }} />}
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#f5f5f5' }}>{REASON_LABELS[t.reason] || t.reason}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#666' }}>
                      {new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-bold shrink-0" style={{ color: t.type === 'credit' ? '#22c55e' : '#e91e8c' }}>
                  {t.type === 'credit' ? '+' : '-'}{formatPrice(t.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
