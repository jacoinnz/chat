interface StatCardProps {
  label: string;
  value: string | number;
  trend?: string;
}

export function StatCard({ label, value, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-[#d0d8e0] p-4">
      <p className="text-xs text-[#667781] mb-1">{label}</p>
      <p className="text-2xl font-semibold text-[#1a2a3a]">{value}</p>
      {trend && (
        <p className="text-xs text-[#667781] mt-1">{trend}</p>
      )}
    </div>
  );
}
