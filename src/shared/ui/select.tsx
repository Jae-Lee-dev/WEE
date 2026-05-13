"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "radix-ui"

import { cn } from "@/shared/lib/utils"
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from "lucide-react"

type SelectOption = {
  disabled?: boolean
  label: React.ReactNode
  value: string
}

type OptionSelectProps = Omit<
  React.ComponentProps<typeof SelectPrimitive.Root>,
  "children"
> & {
  contentClassName?: string
  itemClassName?: string
  options: SelectOption[]
  placeholder?: React.ReactNode
  size?: "sm" | "default"
  triggerAriaDescribedBy?: string
  triggerAriaInvalid?: boolean
  triggerAriaLabel?: string
  triggerClassName?: string
}

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function OptionSelect({
  contentClassName,
  itemClassName,
  options,
  placeholder,
  size = "default",
  triggerAriaDescribedBy,
  triggerAriaInvalid,
  triggerAriaLabel,
  triggerClassName,
  ...props
}: OptionSelectProps) {
  return (
    <Select {...props}>
      <SelectTrigger
        aria-describedby={triggerAriaDescribedBy}
        aria-invalid={triggerAriaInvalid}
        aria-label={triggerAriaLabel}
        className={triggerClassName}
        size={size}
      >
        <SelectValue placeholder={placeholder} />
        <SelectTriggerSizer options={options} />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            className={itemClassName}
            disabled={option.disabled}
            value={option.value}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function SelectGroup({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  )
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "grid w-fit grid-cols-[minmax(0,1fr)_auto] items-center gap-x-1.5 whitespace-nowrap rounded-[6px] border border-gray-200 bg-white px-2.5 py-2 text-label-18 text-gray-700 transition-colors outline-none select-none hover:border-gray-300 focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:ring-2 aria-invalid:ring-red-100 data-placeholder:text-gray-500 data-open:border-gray-200 data-open:focus-visible:border-gray-200 data-open:focus-visible:ring-gray-200 data-[size=default]:min-h-[42px] data-[size=sm]:min-h-9 data-[size=sm]:px-2 data-[size=sm]:py-1.5 data-[size=sm]:text-label-14-medium *:data-[slot=select-value]:col-start-1 *:data-[slot=select-value]:row-start-1 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 data-open:[&_svg]:rotate-180 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="pointer-events-none col-start-2 row-start-1 size-5 justify-self-end text-gray-700 transition-transform duration-150 ease-out" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectTriggerSizer({ options }: { options: SelectOption[] }) {
  return (
    <>
      {options.map((option) => (
        <span
          key={option.value}
          aria-hidden="true"
          className="invisible pointer-events-none col-span-2 col-start-1 row-start-1 flex items-center gap-3 whitespace-nowrap"
        >
          <span>{option.label}</span>
          <CheckIcon className="size-5 stroke-[2.4]" />
        </span>
      ))}
    </>
  )
}

function SelectContent({
  className,
  children,
  position = "popper",
  align = "start",
  alignOffset = -5,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        data-align-trigger={position === "item-aligned"}
        className={cn(
          "relative z-50 max-h-(--radix-select-content-available-height) min-w-[calc(var(--radix-select-trigger-width)+10px)] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-[6px] border border-gray-200 bg-white text-gray-700 shadow-[0_0_20px_rgba(0,0,0,0.08)] duration-100 data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        position={position}
        align={align}
        alignOffset={alignOffset}
        sideOffset={sideOffset}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          data-position={position}
          className={cn(
            "p-3",
            position === "popper" && "w-full"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("px-0 py-2 text-label-12-medium text-gray-500", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative grid w-full cursor-default grid-cols-[1fr_20px] items-center gap-3 border-b border-gray-200 py-3 pr-0 pl-0 text-label-18 text-gray-700 outline-hidden select-none first:pt-0 last:border-b-0 last:pb-0 focus:text-gray-900 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="pointer-events-none flex size-5 items-center justify-center text-green-400">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="pointer-events-none size-5 stroke-[2.4]" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none my-0 h-px bg-gray-200", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "z-10 flex cursor-default items-center justify-center bg-white py-1 text-gray-700 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronUpIcon
      />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "z-10 flex cursor-default items-center justify-center bg-white py-1 text-gray-700 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronDownIcon
      />
    </SelectPrimitive.ScrollDownButton>
  )
}

export {
  OptionSelect,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
export type { OptionSelectProps, SelectOption }
