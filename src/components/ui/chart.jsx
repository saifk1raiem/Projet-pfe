"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "./utils";

const THEMES = { light: "", dark: ".dark" };

const ChartContext = React.createContext(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartStyle({ id, config }) {
  const colorConfig = Object.entries(config || {}).filter(
    ([, item]) => item?.theme || item?.color
  );

  if (!colorConfig.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(([theme, prefix]) => {
            return `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, item]) => {
    const color =
      (item.theme && item.theme[theme]) || item.color;
    return color ? `  --color-${key}: ${color};` : "";
  })
  .join("\n")}
}
`;
          })
          .join("\n"),
      }}
    />
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;
const ChartLegend = RechartsPrimitive.Legend;

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  formatter,
  color,
  nameKey,
}) {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  return (
    <div
      className={cn(
        "bg-background border rounded-lg px-2.5 py-1.5 text-xs shadow-xl",
        className
      )}
    >
      {payload.map((item, index) => {
        const key = nameKey || item.name || item.dataKey;
        const itemConfig = config?.[key];
        const indicatorColor =
          color || item.payload?.fill || item.color;

        return (
          <div
            key={index}
            className="flex items-center gap-2"
          >
            {!hideIndicator && (
              <div
                className="h-2.5 w-2.5 rounded"
                style={{ backgroundColor: indicatorColor }}
              />
            )}

            <div className="flex flex-1 justify-between">
              <span className="text-muted-foreground">
                {itemConfig?.label || item.name}
              </span>
              {item.value !== undefined && (
                <span className="font-mono">
                  {formatter
                    ? formatter(item.value, item.name)
                    : item.value.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}) {
  const { config } = useChart();

  if (!payload?.length) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      )}
    >
      {payload.map((item, index) => {
        const key = nameKey || item.dataKey;
        const itemConfig = config?.[key];

        return (
          <div key={index} className="flex items-center gap-1.5">
            {!hideIcon && itemConfig?.icon ? (
              <itemConfig.icon />
            ) : (
              <div
                className="h-2 w-2 rounded"
                style={{ backgroundColor: item.color }}
              />
            )}
            {itemConfig?.label}
          </div>
        );
      })}
    </div>
  );
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
};