"use client";

import React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "./utils";

function Switch({ className, ...props }) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-gray-200 " +
          "focus-visible:border-ring focus-visible:ring-2 dark:data-[state=unchecked]:bg-gray-700 " +
          "inline-flex h-5 w-8 items-center rounded-full border border-transparent " +
          "transition-all outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-white dark:bg-gray-100 pointer-events-none block h-4 w-4 rounded-full " +
            "transition-transform data-[state=checked]:translate-x-3 data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };