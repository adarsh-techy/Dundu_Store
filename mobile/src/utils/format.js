import { COLORS } from '../config';

export function formatPrice(amount) {
  if (amount === null || amount === undefined) return '₹0';
  const num = parseFloat(amount);
  if (isNaN(num)) return '₹0';
  return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getStatusColor(status) {
  if (!status) return COLORS.textSecondary;
  switch (status.toLowerCase()) {
    case 'pending':
      return '#F59E0B';
    case 'packed':
      return '#3B82F6';
    case 'shipped':
      return '#8B5CF6';
    case 'delivered':
      return COLORS.success;
    case 'cancelled':
      return COLORS.error;
    case 'returned':
      return '#EC4899';
    case 'return_requested':
      return '#F97316';
    default:
      return COLORS.textSecondary;
  }
}

export function getStatusLabel(status) {
  if (!status) return 'Unknown';
  switch (status.toLowerCase()) {
    case 'pending':
      return 'Pending';
    case 'packed':
      return 'Packed';
    case 'shipped':
      return 'Shipped';
    case 'delivered':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
    case 'returned':
      return 'Returned';
    case 'return_requested':
      return 'Return Requested';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}
