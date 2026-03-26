import { createElement } from "react";
import { TrendingDown, TrendingUp, Users } from "lucide-react";
import { Card } from "../ui/card";

export function ComparisonStat({
  title,
  value,
  deltaPercent,
  deltaLabel = "",
  deltaVariant = "trend",
  delay,
  icon = Users,
  iconBg = "bg-[#e8f0ff]",
  iconColor = "text-[#0f63f2]",
}) {
  const hasDelta = Number.isFinite(deltaPercent);
  const isTrend = deltaVariant === "trend";
  const isPositiveTrend = (deltaPercent ?? 0) >= 0;

  return (
    <Card
      className="leoni-rise-up rounded-[20px] border border-[#dfe5e2] bg-white p-5 shadow-sm"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] text-[#5f6777]">{title}</p>
          <div className="mt-1 flex items-baseline gap-3">
            <h3 className="leoni-metric text-[42px] font-semibold leading-none text-[#191c20]">{value}</h3>
            {hasDelta ? (
              <div
                className={`flex items-center gap-1 text-[14px] ${
                  isTrend
                    ? (isPositiveTrend ? "text-[#005ca9]" : "text-[#ea3737]")
                    : "text-[#005ca9]"
                }`}
              >
                {isTrend
                  ? (
                    isPositiveTrend ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
                  )
                  : null}
                <span>{(isTrend ? Math.abs(deltaPercent) : deltaPercent).toFixed(1)}%</span>
                {deltaLabel ? <span className="text-[13px] text-[#5f6777]">{deltaLabel}</span> : null}
              </div>
            ) : null}
          </div>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg}`}>
          {createElement(icon, { className: `h-6 w-6 ${iconColor}` })}
        </div>
      </div>
    </Card>
  );
}
