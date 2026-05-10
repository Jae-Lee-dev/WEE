"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Option<T extends string> = { value: T; label: string };

type SegmentProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

function Segment<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentProps<T>) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as T)}>
      <TabsList
        variant="segment"
        className={cn("inline-flex items-center", className)}
      >
        {options.map((option) => (
          <TabsTrigger key={option.value} variant="segment" value={option.value}>
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export { Segment };
