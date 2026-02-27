import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { TrendingUp, BarChart3, Waves } from "lucide-react";

export function AnalyticsChart({ data, graphType, deviceName }) {

  const renderConsumptionChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="consumptionGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />

        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            color: "hsl(var(--card-foreground))"
          }}
          labelFormatter={(value) => `Time: ${value}`}
          formatter={(value, name) => [
            `${Number(value).toFixed(2)} ${
              name === "kwh"
                ? "kWh"
                : name === "kw"
                ? "kW"
                : name === "billing"
                ? "₹"
                : name.toUpperCase()
            }`,
            name === "kwh"
              ? "Energy Consumption"
              : name === "kw"
              ? "Active Power"
              : name === "billing"
              ? "Billing Amount"
              : name.toUpperCase()
          ]}
        />

        <Legend />

        <Area
          type="monotone"
          dataKey="kwh"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#consumptionGradient)"
          name="Energy (kWh)"
        />

        <Line
          type="monotone"
          dataKey="kw"
          stroke="hsl(var(--chart-2))"
          strokeWidth={2}
          name="Power (kW)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderParameterizedChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />

        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            color: "hsl(var(--card-foreground))"
          }}
          labelFormatter={(value) => `Time: ${value}`}
          formatter={(value, name) => [
            `${Number(value).toFixed(2)}`,
            name
          ]}
        />

        <Legend />

        <Line type="monotone" dataKey="kvah" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="KVAH" />
        <Line type="monotone" dataKey="kva" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="KVA" />
        <Line type="monotone" dataKey="kw" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} name="KW" />
        <Line type="monotone" dataKey="pf" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} name="Power Factor" />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderHarmonicChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />

        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            color: "hsl(var(--card-foreground))"
          }}
          labelFormatter={(value) => `Time: ${value}`}
          formatter={(value) => [`${Number(value).toFixed(2)} KVARh`]}
        />

        <Legend />

        <Bar dataKey="kvarh_lag" fill="hsl(var(--chart-4))" name="KVARh (Lag)" radius={[2, 2, 0, 0]} />
        <Bar dataKey="kvarh_lead" fill="hsl(var(--chart-5))" name="KVARh (Lead)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  const getChartTitle = () => {
    switch (graphType) {
      case "consumption":
        return "Energy Consumption Trends";
      case "parameterized":
        return "Parameterized Power Analysis";
      case "harmonic":
        return "Harmonic Analysis - Reactive Power";
      default:
        return "Energy Analysis";
    }
  };

  const getChartIcon = () => {
    switch (graphType) {
      case "consumption":
        return TrendingUp;
      case "parameterized":
        return BarChart3;
      case "harmonic":
        return Waves;
      default:
        return TrendingUp;
    }
  };

  const ChartIcon = getChartIcon();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartIcon className="w-5 h-5 text-primary" />
          {getChartTitle()}
        </CardTitle>
        <CardDescription>
          Energy analysis for {deviceName}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">

          <Tabs value={graphType} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="consumption">
                <TrendingUp className="w-4 h-4 mr-2" />
                Consumption
              </TabsTrigger>
              <TabsTrigger value="parameterized">
                <BarChart3 className="w-4 h-4 mr-2" />
                Parameters
              </TabsTrigger>
              <TabsTrigger value="harmonic">
                <Waves className="w-4 h-4 mr-2" />
                Harmonic
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div>
            {graphType === "consumption" && renderConsumptionChart()}
            {graphType === "parameterized" && renderParameterizedChart()}
            {graphType === "harmonic" && renderHarmonicChart()}
          </div>

        </div>
      </CardContent>
    </Card>
  );
}