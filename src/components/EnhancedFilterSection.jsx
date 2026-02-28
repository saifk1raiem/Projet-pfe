import { useState } from "react";
import { Card, CardContent } from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Filter } from "lucide-react";

export function EnhancedFilterSection({
  selectedFilterType,
  selectedDevice,
  selectedDevices,
  dataMode,
  selectedDay,
  onFilterTypeChange,
  onDeviceChange,
  onDevicesChange,
  onDataModeChange,
  onDayChange,
  onApplyFilters,
}) {
  const [isVirtualGroupDropdownOpen, setIsVirtualGroupDropdownOpen] =
    useState(false);

  const allItems = [
    {
      id: "device-1",
      name: "Formation Securite Niveau 1",
      location: "Atelier A",
      status: "active",
    },
    {
      id: "device-2",
      name: "Formation Qualite Process",
      location: "Atelier A",
      status: "active",
    },
    {
      id: "device-3",
      name: "Formation Maintenance Previsionnelle",
      location: "Atelier B",
      status: "active",
    },
    {
      id: "device-4",
      name: "Formation Lean Manufacturing",
      location: "Atelier B",
      status: "warning",
    },
    {
      id: "device-5",
      name: "Formation Soft Skills Manager",
      location: "Campus RH",
      status: "active",
    },
    {
      id: "device-6",
      name: "Formation Communication Interne",
      location: "Campus RH",
      status: "active",
    },
    {
      id: "device-7",
      name: "Formation Industrie 4.0",
      location: "Atelier B",
      status: "active",
    },
    {
      id: "device-8",
      name: "Formation Outils Numeriques",
      location: "Atelier B",
      status: "active",
    },
    {
      id: "device-9",
      name: "Formation Leadership Equipe",
      location: "Centre Formation",
      status: "active",
    },
    {
      id: "device-10",
      name: "Formation Onboarding Nouveaux",
      location: "Centre Formation",
      status: "inactive",
    },
  ];

  const virtualGroups = {
    "group-production": {
      name: "Formations Techniques",
      devices: [
        "device-3",
        "device-4",
        "device-7",
        "device-8",
        "device-9",
        "device-10",
      ],
    },
    "group-administration": {
      name: "Formations Administratives",
      devices: ["device-1", "device-2", "device-5", "device-6"],
    },
  };

  const dataModes = [
    { id: "real-time", name: "En cours" },
    { id: "historical", name: "Historique" },
    { id: "combined", name: "Vue combinee" },
  ];

  const timePerl = [
    { id: "today", name: "Aujourd'hui" },
    { id: "yesterday", name: "Hier" },
    { id: "last-7-days", name: "7 derniers jours" },
    { id: "last-30-days", name: "30 derniers jours" },
  ];

  const handleVirtualGroupDeviceToggle = (deviceId) => {
    const newSelection = selectedDevices.includes(deviceId)
      ? selectedDevices.filter((id) => id !== deviceId)
      : [...selectedDevices, deviceId];
    onDevicesChange(newSelection);
  };

  const getDevicesForGroup = (groupId) => {
    const group = virtualGroups[groupId];
    if (!group) return [];
    return allItems.filter((device) => group.devices.includes(device.id));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "warning":
        return "bg-yellow-500";
      case "inactive":
        return "bg-gray-400";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <Card className="border-border/30 shadow-sm mb-6 bg-card/80 backdrop-blur-sm">
      <CardContent className="p-5">
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          {/* Filter Type Selection */}
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Type de filtre
            </label>
            <Select
              value={selectedFilterType}
              onValueChange={(value) => onFilterTypeChange(value)}
            >
              <SelectTrigger className="h-11 border-border/50 bg-background/50">
                <SelectValue placeholder="Selectionner le type de filtre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="device">Formation individuelle</SelectItem>
                <SelectItem value="virtual-group">Groupe de formation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Device/Group Selection */}
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              {selectedFilterType === "device"
                ? "Selectionner la formation"
                : "Selectionner un groupe et les formations"}
            </label>

            {selectedFilterType === "device" ? (
              <Select value={selectedDevice} onValueChange={onDeviceChange}>
                <SelectTrigger className="h-11 border-border/50 bg-background/50">
                  <SelectValue placeholder="Choisir une formation" />
                </SelectTrigger>
                <SelectContent>
                  {allItems.map((device) => (
                    <SelectItem key={device.id} value={device.id}>
                      <div className="flex items-center gap-2 w-full">
                        <div
                          className={`w-2 h-2 rounded-full ${getStatusColor(device.status)}`}
                        />
                        <span className="flex-1">{device.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {device.location}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select
                value={selectedDevice}
                onValueChange={onDeviceChange}
                open={isVirtualGroupDropdownOpen}
                onOpenChange={setIsVirtualGroupDropdownOpen}
              >
                <SelectTrigger className="h-11 border-border/50 bg-background/50">
                  <SelectValue placeholder="Choisir un groupe de formations">
                    {selectedDevice && virtualGroups[selectedDevice] && (
                      <div className="flex items-center gap-2">
                        <span>{virtualGroups[selectedDevice].name}</span>
                        {selectedDevices.length > 0 && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {selectedDevices.length} formations selectionnees
                          </Badge>
                        )}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="w-100">
                  {Object.entries(virtualGroups).map(([groupId, group]) => (
                    <div key={groupId}>
                      <SelectItem
                        value={groupId}
                        onSelect={() => {
                          onDeviceChange(groupId);
                          setIsVirtualGroupDropdownOpen(true);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{group.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {group.devices.length} formations
                          </Badge>
                        </div>
                      </SelectItem>

                      {selectedDevice === groupId && (
                        <div className="mt-2 pl-4 border-l-2 border-primary/20 space-y-2">
                          <div className="text-xs font-medium text-muted-foreground mb-2">
                            Selectionner les formations:
                          </div>
                          {getDevicesForGroup(groupId).map((device) => (
                            <div
                              key={device.id}
                              className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleVirtualGroupDeviceToggle(device.id);
                              }}
                            >
                              <Checkbox
                                checked={selectedDevices.includes(device.id)}
                                onCheckedChange={() =>
                                  handleVirtualGroupDeviceToggle(device.id)
                                }
                                disabled={device.status === "inactive"}
                              />
                              <div
                                className={`w-2 h-2 rounded-full ${getStatusColor(device.status)}`}
                              />
                              <span className="text-sm flex-1">
                                {device.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {device.location}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Data Mode */}
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Mode des donnees
            </label>
            <Select value={dataMode} onValueChange={onDataModeChange}>
              <SelectTrigger className="h-11 border-border/50 bg-background/50">
                <SelectValue placeholder="Selectionner le mode" />
              </SelectTrigger>
              <SelectContent>
                {dataModes.map((mode) => (
                  <SelectItem key={mode.id} value={mode.id}>
                    {mode.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Period */}
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Periode
            </label>
            <Select value={selectedDay} onValueChange={onDayChange}>
              <SelectTrigger className="h-11 border-border/50 bg-background/50">
                <SelectValue placeholder="Selectionner la periode" />
              </SelectTrigger>
              <SelectContent>
                {timePerl.map((day) => (
                  <SelectItem key={day.id} value={day.id}>
                    {day.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filter Button */}
          <div className="flex gap-2">
            <Button
              onClick={onApplyFilters}
              className="h-11 px-6 bg-primary hover:bg-primary/90 shadow-sm"
            >
              <Filter className="w-4 h-4 mr-2" />
              Appliquer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
