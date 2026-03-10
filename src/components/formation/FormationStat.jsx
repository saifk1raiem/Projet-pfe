import { Card } from "../ui/card";

export function FormationStat({ icon: Icon, title, value, color }) {
  return (
    <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${color.bg}`}>
          <Icon className={`h-5 w-5 ${color.text}`} />
        </div>
        <div>
          <p className="text-[15px] text-[#5f6777]">{title}</p>
          <p className="leoni-metric text-[36px] font-semibold leading-tight text-[#191c20]">{value}</p>
        </div>
      </div>
    </Card>
  );
}
