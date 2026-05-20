import { Users, CalendarDays, Zap, Wallet } from 'lucide-react';
import './StatCard.css';

const ICON_MAP = {
  users: Users,
  bookings: CalendarDays,
  active: Zap,
  revenue: Wallet,
};

function StatCard({ title, value, iconKey, color, trend }) {
  const Icon = ICON_MAP[iconKey] || Users;

  return (
    <div className="stat-card" style={{ '--card-accent': color }}>
      <div className="stat-icon-wrap" style={{ background: `${color}18`, borderColor: `${color}30` }}>
        <Icon size={22} strokeWidth={1.75} color={color} />
      </div>
      <div className="stat-body">
        <p className="stat-title">{title}</p>
        <p className="stat-value">{value}</p>
        {trend !== undefined && (
          <p className="stat-trend" style={{ color: trend >= 0 ? 'var(--green-600)' : 'var(--red)' }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% this month
          </p>
        )}
      </div>
    </div>
  );
}

export default StatCard;
