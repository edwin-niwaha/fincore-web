import { Card } from '@/components/ui/card';

export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="relative overflow-hidden bg-white/98">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#127D61] via-emerald-400 to-transparent" />
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-black tracking-tight text-[#127D61]">
        {value}
      </p>
    </Card>
  );
}
