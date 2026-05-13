"use client";

import * as React from "react";
import { PlusIcon, XIcon } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { IconCheck, IconSearch } from "@/shared/ui/icons";

type TagSearchPickerOption = {
  disabled?: boolean;
  description?: string;
  label: string;
  value: string;
};

type TagSearchPickerChangeReason = "select" | "remove" | "create";

type TagSearchPickerChangeDetails = {
  option: TagSearchPickerOption;
  reason: TagSearchPickerChangeReason;
  value: readonly string[];
};

type TagSearchPickerProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children" | "defaultValue" | "onChange"
> & {
  allowCreate?: boolean;
  closeOnSelect?: boolean;
  createLabel?: (query: string) => React.ReactNode;
  defaultInputValue?: string;
  defaultOpen?: boolean;
  defaultValue?: readonly string[];
  disabled?: boolean;
  emptyMessage?: React.ReactNode;
  inputAriaLabel?: string;
  inputId?: string;
  inputValue?: string;
  invalid?: boolean;
  listboxClassName?: string;
  maxOptions?: number;
  onCreateOption?: (label: string) => TagSearchPickerOption | void;
  onInputValueChange?: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
  onValueChange?: (
    value: readonly string[],
    details: TagSearchPickerChangeDetails,
  ) => void;
  open?: boolean;
  options: readonly TagSearchPickerOption[];
  placeholder?: string;
  triggerClassName?: string;
  value?: readonly string[];
};

type DropdownItem =
  | { option: TagSearchPickerOption; type: "option" }
  | { label: string; type: "create" };

const defaultEmptyMessage = "일치하는 태그가 없습니다.";
const defaultPlaceholder = "태그를 검색하거나 추가하세요";

function TagSearchPicker({
  allowCreate = false,
  closeOnSelect = false,
  className,
  createLabel,
  defaultInputValue = "",
  defaultOpen = false,
  defaultValue = [],
  disabled = false,
  emptyMessage = defaultEmptyMessage,
  inputAriaLabel = "태그 검색",
  inputId: inputIdProp,
  inputValue,
  invalid = false,
  listboxClassName,
  maxOptions = 6,
  onCreateOption,
  onInputValueChange,
  onOpenChange,
  onValueChange,
  open,
  options,
  placeholder = defaultPlaceholder,
  triggerClassName,
  value,
  ...props
}: TagSearchPickerProps) {
  const generatedId = React.useId();
  const inputId = inputIdProp ?? `${generatedId}-input`;
  const listboxId = `${inputId}-listbox`;
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isComposingRef = React.useRef(false);
  const isValueControlled = value !== undefined;
  const isInputControlled = inputValue !== undefined;
  const isOpenControlled = open !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = React.useState(() =>
    uniqueValues(defaultValue),
  );
  const [uncontrolledInputValue, setUncontrolledInputValue] =
    React.useState(defaultInputValue);
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const [createdOptions, setCreatedOptions] = React.useState<
    readonly TagSearchPickerOption[]
  >([]);
  const [activeIndex, setActiveIndex] = React.useState(-1);

  const selectedValues = React.useMemo(
    () => uniqueValues(isValueControlled ? value : uncontrolledValue),
    [isValueControlled, uncontrolledValue, value],
  );
  const query = isInputControlled ? inputValue : uncontrolledInputValue;
  const isOpen = isOpenControlled ? open : uncontrolledOpen;
  const normalizedQuery = normalizeTagSearchText(query);
  const trimmedQuery = query.trim();
  const allOptions = React.useMemo(
    () => mergeOptions(options, createdOptions),
    [createdOptions, options],
  );
  const optionByValue = React.useMemo(() => {
    const optionMap = new Map<string, TagSearchPickerOption>();

    allOptions.forEach((option) => {
      optionMap.set(option.value, option);
    });

    return optionMap;
  }, [allOptions]);
  const selectedOptions = React.useMemo(
    () =>
      selectedValues.map(
        (selectedValue) =>
          optionByValue.get(selectedValue) ?? {
            label: selectedValue,
            value: selectedValue,
          },
      ),
    [optionByValue, selectedValues],
  );
  const filteredOptions = React.useMemo(() => {
    const selectedSet = new Set(selectedValues);

    return allOptions
      .filter((option) => !selectedSet.has(option.value))
      .filter((option) => matchesOption(option, normalizedQuery))
      .slice(0, maxOptions);
  }, [allOptions, maxOptions, normalizedQuery, selectedValues]);
  const hasExactOption = React.useMemo(() => {
    if (!normalizedQuery) return false;

    return allOptions.some(
      (option) => normalizeTagSearchText(option.label) === normalizedQuery,
    );
  }, [allOptions, normalizedQuery]);
  const canCreate = allowCreate && trimmedQuery.length > 0 && !hasExactOption;
  const dropdownItems = React.useMemo<DropdownItem[]>(() => {
    const optionItems = filteredOptions.map((option) => ({
      option,
      type: "option" as const,
    }));

    if (!canCreate) return optionItems;

    return [...optionItems, { label: trimmedQuery, type: "create" as const }];
  }, [canCreate, filteredOptions, trimmedQuery]);
  const showListbox = isOpen && !disabled;
  const effectiveActiveIndex = React.useMemo(() => {
    if (!showListbox) return -1;

    if (
      activeIndex >= 0 &&
      activeIndex < dropdownItems.length &&
      !isDropdownItemDisabled(dropdownItems[activeIndex])
    ) {
      return activeIndex;
    }

    return findNextEnabledItemIndex(dropdownItems, -1, 1);
  }, [activeIndex, dropdownItems, showListbox]);
  const activeItem =
    effectiveActiveIndex >= 0 ? dropdownItems[effectiveActiveIndex] : undefined;

  const setQuery = React.useCallback(
    (nextQuery: string) => {
      if (!isInputControlled) {
        setUncontrolledInputValue(nextQuery);
      }

      onInputValueChange?.(nextQuery);
    },
    [isInputControlled, onInputValueChange],
  );

  const setOpenState = React.useCallback(
    (nextOpen: boolean) => {
      if (disabled) return;

      if (!isOpenControlled) {
        setUncontrolledOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [disabled, isOpenControlled, onOpenChange],
  );

  const commitValue = React.useCallback(
    (
      nextValue: readonly string[],
      details: Omit<TagSearchPickerChangeDetails, "value">,
    ) => {
      const normalizedValue = uniqueValues(nextValue);

      if (!isValueControlled) {
        setUncontrolledValue(normalizedValue);
      }

      onValueChange?.(normalizedValue, {
        ...details,
        value: normalizedValue,
      });
    },
    [isValueControlled, onValueChange],
  );

  const focusInput = React.useCallback(() => {
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  const selectOption = React.useCallback(
    (option: TagSearchPickerOption, reason: TagSearchPickerChangeReason) => {
      if (disabled || option.disabled || selectedValues.includes(option.value)) {
        return;
      }

      commitValue([...selectedValues, option.value], { option, reason });
      setQuery("");
      if (closeOnSelect) {
        setOpenState(false);
      } else {
        setOpenState(true);
        focusInput();
      }
    },
    [
      closeOnSelect,
      commitValue,
      disabled,
      focusInput,
      selectedValues,
      setOpenState,
      setQuery,
    ],
  );

  const removeOption = React.useCallback(
    (option: TagSearchPickerOption) => {
      if (disabled) return;

      commitValue(
        selectedValues.filter((selectedValue) => selectedValue !== option.value),
        { option, reason: "remove" },
      );
      setOpenState(true);
      focusInput();
    },
    [commitValue, disabled, focusInput, selectedValues, setOpenState],
  );

  const createOption = React.useCallback(
    (label: string) => {
      const normalizedLabel = label.trim();

      if (!normalizedLabel) return;

      const existingOption = allOptions.find(
        (option) =>
          normalizeTagSearchText(option.label) ===
          normalizeTagSearchText(normalizedLabel),
      );

      if (existingOption) {
        selectOption(existingOption, "select");
        return;
      }

      const option =
        onCreateOption?.(normalizedLabel) ??
        createDefaultOption(normalizedLabel, allOptions);

      setCreatedOptions((currentOptions) => mergeOptions(currentOptions, [option]));
      selectOption(option, "create");
    },
    [allOptions, onCreateOption, selectOption],
  );

  const commitDropdownItem = React.useCallback(
    (item: DropdownItem | undefined) => {
      if (!item) return;

      if (item.type === "create") {
        createOption(item.label);
        return;
      }

      selectOption(item.option, "select");
    },
    [createOption, selectOption],
  );

  React.useEffect(() => {
    if (!showListbox) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenState(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [setOpenState, showListbox]);

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (isImeComposingKeyDown(event, isComposingRef.current)) return;

    if (event.key === "ArrowDown") {
      setOpenState(true);
      setActiveIndex((currentIndex) =>
        findNextEnabledItemIndex(
          dropdownItems,
          currentIndex === -1 ? effectiveActiveIndex : currentIndex,
          1,
        ),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      setOpenState(true);
      setActiveIndex((currentIndex) =>
        findNextEnabledItemIndex(
          dropdownItems,
          currentIndex === -1 ? effectiveActiveIndex : currentIndex,
          -1,
        ),
      );
      return;
    }

    if (event.key === "Enter") {
      if (!showListbox && trimmedQuery) {
        setOpenState(true);
        return;
      }

      if (activeItem) {
        commitDropdownItem(activeItem);
        return;
      }

      if (canCreate) {
        createOption(trimmedQuery);
      }

      return;
    }

    if (event.key === "Backspace" && !query && selectedOptions.length > 0) {
      removeOption(selectedOptions[selectedOptions.length - 1]);
      return;
    }

    if (event.key === "Escape") {
      setOpenState(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className={cn("relative w-full", className)}
      data-slot="tag-search-picker"
      {...props}
    >
      <div
        aria-disabled={disabled || undefined}
        aria-invalid={invalid || undefined}
        className={cn(
          "group grid min-h-11 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[6px] border border-gray-100 bg-white px-3 py-2 transition-colors duration-150 ease-out hover:border-gray-200 focus-within:border-green-400 focus-within:ring-2 focus-within:ring-green-100 aria-disabled:pointer-events-none aria-disabled:bg-gray-50 aria-disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:ring-2 aria-invalid:ring-red-100",
          triggerClassName,
        )}
        data-slot="tag-search-picker-trigger"
        onPointerDown={(event) => {
          if (disabled) return;

          if ((event.target as HTMLElement).closest("button")) return;

          inputRef.current?.focus();
        }}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {selectedOptions.map((option) => (
            <TagSearchPickerChip
              key={option.value}
              disabled={disabled}
              option={option}
              onRemove={() => removeOption(option)}
            />
          ))}
          <input
            ref={inputRef}
            aria-activedescendant={
              activeItem
                ? getDropdownItemId(listboxId, effectiveActiveIndex)
                : undefined
            }
            aria-autocomplete="list"
            aria-controls={showListbox ? listboxId : undefined}
            aria-expanded={showListbox}
            aria-label={inputAriaLabel}
            disabled={disabled}
            id={inputId}
            role="combobox"
            value={query}
            onCompositionEnd={() => {
              window.setTimeout(() => {
                isComposingRef.current = false;
              }, 0);
            }}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpenState(true);
            }}
            onFocus={() => setOpenState(true)}
            onKeyDown={handleInputKeyDown}
            placeholder={selectedOptions.length === 0 ? placeholder : undefined}
            className="min-w-[120px] flex-1 bg-transparent py-1 text-h-18-regular tracking-normal text-gray-900 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed"
          />
        </div>
        <IconSearch className="size-6 shrink-0 text-gray-400 transition-colors duration-150 ease-out group-focus-within:text-green-400" />
      </div>

      {showListbox ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="태그 선택"
          className={cn(
            "absolute top-[calc(100%+6px)] left-0 z-50 max-h-64 w-full overflow-y-auto rounded-[6px] border border-gray-200 bg-white p-2 shadow-[0_8px_20px_rgba(17,24,39,0.12)]",
            listboxClassName,
          )}
        >
          {dropdownItems.length > 0 ? (
            dropdownItems.map((item, index) => (
              <TagSearchPickerOptionRow
                key={
                  item.type === "option" ? item.option.value : `create:${item.label}`
                }
                active={index === effectiveActiveIndex}
                createLabel={createLabel}
                id={getDropdownItemId(listboxId, index)}
                item={item}
                onClick={() => commitDropdownItem(item)}
                onMouseEnter={() => setActiveIndex(index)}
              />
            ))
          ) : (
            <div className="px-2 py-3 text-label-14-regular tracking-normal text-gray-500">
              {emptyMessage}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function TagSearchPickerChip({
  disabled,
  onRemove,
  option,
}: {
  disabled: boolean;
  onRemove: () => void;
  option: TagSearchPickerOption;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-[4px] bg-gray-100 px-2.5 py-1 text-h-16-medium tracking-normal text-gray-700">
      <span className="min-w-0 truncate">{option.label}</span>
      <button
        type="button"
        aria-label={`${option.label} 태그 제거`}
        disabled={disabled}
        onClick={onRemove}
        className="grid size-4 shrink-0 place-items-center rounded-[3px] text-gray-400 transition-colors duration-150 ease-out hover:bg-gray-200 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 disabled:pointer-events-none"
      >
        <XIcon className="size-3.5" strokeWidth={2.5} />
      </button>
    </span>
  );
}

function TagSearchPickerOptionRow({
  active,
  createLabel,
  id,
  item,
  onClick,
  onMouseEnter,
}: {
  active: boolean;
  createLabel?: (query: string) => React.ReactNode;
  id: string;
  item: DropdownItem;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  const disabled = isDropdownItemDisabled(item);

  if (item.type === "create") {
    return (
      <button
        type="button"
        id={id}
        role="option"
        aria-selected={false}
        data-active={active || undefined}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        className="flex min-h-11 w-full items-center gap-2 rounded-[4px] px-2 text-left text-label-18 tracking-normal text-gray-800 transition-colors duration-150 ease-out hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-200 data-active:bg-green-50"
      >
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-green-100 text-green-500">
          <PlusIcon className="size-4" strokeWidth={2.4} />
        </span>
        <span className="min-w-0 truncate">
          {createLabel?.(item.label) ?? (
            <>
              <span className="font-semibold text-gray-900">{item.label}</span>
              <span> 추가</span>
            </>
          )}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      id={id}
      role="option"
      aria-selected={false}
      data-active={active || undefined}
      onClick={onClick}
      onMouseEnter={() => {
        if (!disabled) {
          onMouseEnter();
        }
      }}
      className="grid min-h-11 w-full grid-cols-[minmax(0,1fr)_20px] items-center gap-3 rounded-[4px] px-2 text-left text-gray-800 transition-colors duration-150 ease-out hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-200 disabled:cursor-not-allowed disabled:opacity-45 data-active:bg-green-50"
    >
      <span className="min-w-0">
        <span className="block truncate text-label-18 tracking-normal">
          {item.option.label}
        </span>
        {item.option.description ? (
          <span className="block truncate text-label-12-regular tracking-normal text-gray-500">
            {item.option.description}
          </span>
        ) : null}
      </span>
      <IconCheck className="size-5 text-green-400 opacity-0" />
    </button>
  );
}

function createDefaultOption(
  label: string,
  options: readonly TagSearchPickerOption[],
) {
  const baseValue =
    normalizeTagSearchText(label).replace(/\s+/g, "-") || "custom-tag";
  const optionValues = new Set(options.map((option) => option.value));
  let value = `custom:${baseValue}`;
  let index = 2;

  while (optionValues.has(value)) {
    value = `custom:${baseValue}-${index}`;
    index += 1;
  }

  return { label, value };
}

function findNextEnabledItemIndex(
  items: readonly DropdownItem[],
  currentIndex: number,
  direction: 1 | -1,
) {
  if (items.length === 0) return -1;

  for (let offset = 1; offset <= items.length; offset += 1) {
    const nextIndex =
      (currentIndex + offset * direction + items.length) % items.length;

    if (!isDropdownItemDisabled(items[nextIndex])) {
      return nextIndex;
    }
  }

  return -1;
}

function getDropdownItemId(listboxId: string, index: number) {
  return `${listboxId}-item-${index}`;
}

function isDropdownItemDisabled(item: DropdownItem | undefined) {
  return item?.type === "option" && item.option.disabled;
}

function matchesOption(option: TagSearchPickerOption, normalizedQuery: string) {
  if (!normalizedQuery) return true;

  return [option.label, option.description ?? ""].some((text) =>
    normalizeTagSearchText(text).includes(normalizedQuery),
  );
}

function mergeOptions(
  baseOptions: readonly TagSearchPickerOption[],
  nextOptions: readonly TagSearchPickerOption[],
) {
  const optionMap = new Map<string, TagSearchPickerOption>();

  baseOptions.forEach((option) => {
    optionMap.set(option.value, option);
  });
  nextOptions.forEach((option) => {
    optionMap.set(option.value, option);
  });

  return Array.from(optionMap.values());
}

function normalizeTagSearchText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
}

function isImeComposingKeyDown(
  event: React.KeyboardEvent<HTMLInputElement>,
  isComposing: boolean,
) {
  return (
    isComposing ||
    event.nativeEvent.isComposing ||
    event.nativeEvent.keyCode === 229 ||
    event.key === "Process"
  );
}

function uniqueValues(values: readonly string[] | undefined) {
  return Array.from(new Set(values ?? []));
}

export { TagSearchPicker };
export type {
  TagSearchPickerChangeDetails,
  TagSearchPickerOption,
  TagSearchPickerProps,
};
