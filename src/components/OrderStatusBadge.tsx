import React from 'react';
import { OrderStatus, STATUS_MAP } from '../types';
import { Clock, Send, CheckCircle2, PackageCheck, AlertTriangle } from 'lucide-react';

interface Props {
  status: OrderStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const OrderStatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const config = STATUS_MAP[status] || STATUS_MAP.TO_BE_ORDERED;

  const renderIcon = () => {
    switch (status) {
      case 'TO_BE_ORDERED':
        return <Clock className="w-3.5 h-3.5" />;
      case 'RFQ_SENT':
        return <Send className="w-3.5 h-3.5" />;
      case 'ORDERED':
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'DELIVERED':
        return <PackageCheck className="w-3.5 h-3.5" />;
      case 'ON_HOLD':
        return <AlertTriangle className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-xs gap-1.5 font-medium',
    lg: 'px-4 py-1.5 text-sm gap-2 font-semibold'
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border ${config.badgeBg} ${config.badgeText} ${config.badgeBorder} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} animate-pulse`} />
      {renderIcon()}
      <span>{config.label}</span>
    </span>
  );
};
