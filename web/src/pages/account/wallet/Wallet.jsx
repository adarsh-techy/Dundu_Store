import { useQuery } from '@tanstack/react-query';
import { Wallet as WalletIcon, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { walletApi } from '../../../api';
import { formatPrice, formatDateTime } from '../../../utils/format';
import PageHeader from '../../../components/ui/PageHeader';
import EmptyState from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import useDocumentTitle from '../../../hooks/useDocumentTitle';

const REASON_LABELS = {
  order_payment: 'Paid at checkout',
  order_refund: 'Order cancelled — refund',
  return_refund: 'Return refund',
  admin_credit: 'Credit from Dundu',
  admin_debit: 'Adjustment',
};

export default function Wallet() {
  useDocumentTitle('My wallet');
  const { data, isLoading } = useQuery({ queryKey: ['wallet-page'], queryFn: () => walletApi.getTransactions({ limit: 50 }) });
  const balance = data?.data?.balance ?? 0;
  const transactions = data?.data?.transactions || [];

  return (
    <div className="container-x max-w-2xl py-6 md:py-10">
      <PageHeader title="My wallet" subtitle="Refunds and credits land here. Use it to pay for your next order." crumbs={[{ label: 'Wallet' }]} />

      <div className="relative overflow-hidden rounded-3xl p-7 md:p-9 border border-primary/30 bg-gradient-to-br from-[#2a0b1c] via-[#170a11] to-bg mb-8">
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="eyebrow">Available balance</p>
            <p className="font-display text-5xl text-ink mt-2">{isLoading ? '…' : formatPrice(balance)}</p>
            <p className="text-xs text-muted mt-3">Choose “Pay with wallet” at checkout to use it.</p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <WalletIcon className="h-7 w-7 text-primary-soft" />
          </div>
        </div>
      </div>

      <h2 className="font-display text-xl text-ink mb-3">Transactions</h2>
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : transactions.length === 0 ? (
        <EmptyState icon={WalletIcon} title="No transactions yet" description="Refunds, cancellations and store credits will appear here." compact />
      ) : (
        <div className="card divide-y divide-line">
          {transactions.map((t) => {
            const credit = t.type === 'credit';
            return (
              <div key={t.id} className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  {credit ? <ArrowUpCircle className="h-5 w-5 text-success shrink-0" /> : <ArrowDownCircle className="h-5 w-5 text-primary-soft shrink-0" />}
                  <div>
                    <p className="text-sm font-medium text-ink">{REASON_LABELS[t.reason] || t.reason}</p>
                    <p className="text-xs text-muted mt-0.5">{formatDateTime(t.created_at)}{t.note ? ` · ${t.note}` : ''}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${credit ? 'text-success' : 'text-ink'}`}>{credit ? '+' : '−'}{formatPrice(t.amount)}</p>
                  <p className="text-[11px] text-faint">Bal. {formatPrice(t.balance_after)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
