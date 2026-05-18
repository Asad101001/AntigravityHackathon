import './StatCard.css';

function StatCard({ title, value, icon, color }) {
  return (
    <div className="stat-card" style={{ borderTopColor: color }}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <h4 className="stat-title">{title}</h4>
        <p className="stat-value" style={{ color }}>{value}</p>
      </div>
    </div>
  );
}

export default StatCard;
