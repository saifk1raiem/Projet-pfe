import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet, Calendar, TrendingUp, Zap } from "lucide-react";

export function SummaryReportTable({ data, deviceName }) {
  const [isExporting, setIsExporting] = useState(false);

  const calculateSummary = () => {
    const totalKWH = data.reduce((sum, item) => sum + item.kwh, 0);
    const averageKW = data.reduce((sum, item) => sum + item.kw, 0) / data.length;
    const maxKW = Math.max(...data.map(item => item.kw));
    const totalBilling = data.reduce((sum, item) => sum + item.billing, 0);
    const averagePF = data.reduce((sum, item) => sum + item.pf, 0) / data.length;
    const totalCO2 = data.reduce((sum, item) => sum + item.co2_emissions, 0);

    const todayKWH = totalKWH * 0.3;
    const yesterdayKWH = totalKWH * 0.25;
    const thisMonthKWH = totalKWH;
    const lastReading = data[data.length - 1];

    return {
      todayKWH,
      yesterdayKWH,
      thisMonthKWH,
      lastReading,
      totalKWH,
      averageKW,
      maxKW,
      totalBilling,
      averagePF,
      totalCO2
    };
  };

  const summary = calculateSummary();

  const reportData = [
    {
      period: "Today",
      kwh: summary.todayKWH,
      billing: summary.todayKWH * 8.5,
      peakKW: summary.maxKW * 0.8,
      avgPF: summary.averagePF,
      co2: summary.todayKWH * 0.82,
      status: "Active",
      icon: Calendar
    },
    {
      period: "Yesterday",
      kwh: summary.yesterdayKWH,
      billing: summary.yesterdayKWH * 8.5,
      peakKW: summary.maxKW * 0.75,
      avgPF: summary.averagePF * 0.95,
      co2: summary.yesterdayKWH * 0.82,
      status: "Completed",
      icon: TrendingUp
    },
    {
      period: "This Month",
      kwh: summary.thisMonthKWH,
      billing: summary.totalBilling,
      peakKW: summary.maxKW,
      avgPF: summary.averagePF,
      co2: summary.totalCO2,
      status: "In Progress",
      icon: Calendar
    },
    {
      period: "Last Reading",
      kwh: summary.lastReading.kwh,
      billing: summary.lastReading.billing,
      peakKW: summary.lastReading.kw,
      avgPF: summary.lastReading.pf,
      co2: summary.lastReading.co2_emissions,
      status: "Live",
      icon: Zap
    }
  ];

  const handleExport = async (format) => {
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`Exporting ${format.toUpperCase()} report for ${deviceName}`);
    setIsExporting(false);
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case "Active":
      case "Live":
        return "default";
      case "Completed":
        return "secondary";
      case "In Progress":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Summary Report
            </CardTitle>
            <CardDescription>
              Aggregated energy metrics for {deviceName}
            </CardDescription>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isExporting} className="gap-2">
                <Download className="w-4 h-4" />
                {isExporting ? "Exporting..." : "Download Report"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("excel")} className="gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-2">
                <FileText className="w-4 h-4" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Energy (kWh)</TableHead>
                <TableHead>Billing (₹)</TableHead>
                <TableHead>Peak Demand (kW)</TableHead>
                <TableHead>Avg Power Factor</TableHead>
                <TableHead>CO₂ Emissions (kg)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {reportData.map((row, index) => {
                const Icon = row.icon;
                return (
                  <TableRow key={index} className="hover:bg-muted/50">
                    <TableCell className="font-medium flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      {row.period}
                    </TableCell>
                    <TableCell>{row.kwh.toFixed(1)} kWh</TableCell>
                    <TableCell>₹{row.billing.toFixed(2)}</TableCell>
                    <TableCell>{row.peakKW.toFixed(1)} kW</TableCell>
                    <TableCell>{row.avgPF.toFixed(3)}</TableCell>
                    <TableCell>{row.co2.toFixed(1)} kg</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(row.status)}>
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="p-4 bg-accent/30 rounded-lg">
            <div className="text-sm font-medium">Total Consumption</div>
            <div className="text-2xl font-bold">{summary.totalKWH.toFixed(1)} kWh</div>
          </div>

          <div className="p-4 bg-accent/30 rounded-lg">
            <div className="text-sm font-medium">Total Billing</div>
            <div className="text-2xl font-bold">₹{summary.totalBilling.toFixed(2)}</div>
          </div>

          <div className="p-4 bg-accent/30 rounded-lg">
            <div className="text-sm font-medium">Peak Demand</div>
            <div className="text-2xl font-bold">{summary.maxKW.toFixed(1)} kW</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}