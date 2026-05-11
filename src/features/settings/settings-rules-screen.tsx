"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  settingsRulesFixture,
  type SettingsRuleField,
} from "./settings-rules-fixtures";

export function SettingsRulesScreen() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <section
      aria-label="운영 설정"
      className="mx-auto flex h-[calc(100vh-144px)] min-h-[520px] w-full max-w-[1480px] flex-col items-end gap-4 overflow-hidden rounded-[10px] border border-gray-200 bg-white p-4 tracking-normal"
      data-testid="settings-rules-screen"
    >
      <div className="flex w-full flex-col gap-3">
        {settingsRulesFixture.rules.map((rule) => (
          <div
            key={rule.id}
            className="flex h-[58px] items-center justify-between rounded-[10px] border border-gray-200 bg-white px-4 text-h-18-semibold text-gray-500"
          >
            <span>{rule.label}</span>
            <span className="text-h-18-regular font-medium text-gray-900">
              {rule.value}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="flex h-9 items-center justify-center rounded-full bg-green-400 px-4 text-h-18-regular font-medium text-white transition-colors duration-150 ease-out hover:bg-green-450 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
        data-testid="settings-rules-edit-trigger"
        onClick={() => setDialogOpen(true)}
      >
        {settingsRulesFixture.editLabel}
      </button>

      {dialogOpen ? (
        <SettingsRulesDialog onClose={() => setDialogOpen(false)} />
      ) : null}
    </section>
  );
}

function SettingsRulesDialog({ onClose }: { onClose: () => void }) {
  const [firstField, secondField, selectField] =
    settingsRulesFixture.dialog.fields;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#9a9a9a]/70 px-4 py-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-rules-dialog-title"
        className="flex w-[calc(100vw-32px)] max-w-[640px] flex-col gap-8 rounded-[10px] bg-white p-8 shadow-[0px_16px_44px_rgba(17,24,39,0.16)]"
        data-testid="settings-rules-dialog"
      >
        <h2
          id="settings-rules-dialog-title"
          className="text-h-20 tracking-normal text-gray-900"
        >
          {settingsRulesFixture.dialog.title}
        </h2>

        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-6">
            <SettingsRuleInputField field={firstField} />
            <SettingsRuleInputField field={secondField} />
          </div>
          <SettingsRuleInputField field={selectField} />
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="h-11 rounded-[10px] px-6 text-h-18-semibold tracking-normal"
          >
            {settingsRulesFixture.dialog.cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onClose}
            className="h-11 rounded-[10px] px-6 text-h-18-semibold tracking-normal text-white"
          >
            {settingsRulesFixture.dialog.saveLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}

function SettingsRuleInputField({ field }: { field: SettingsRuleField }) {
  return (
    <label className="block w-[312px]">
      <span className="text-h-18-semibold tracking-normal text-gray-900">
        {field.label}
      </span>
      <span className="mt-2 flex items-center gap-2">
        <span
          className={cn(
            "flex h-11 w-[260px] items-center rounded-[8px] border px-3 text-h-18-regular tracking-normal text-gray-900",
            field.kind === "select"
              ? "justify-between border-gray-400 bg-white"
              : "justify-end border-gray-200 bg-gray-50",
          )}
        >
          <input
            readOnly
            aria-label={field.label}
            value={field.value}
            className={cn(
              "min-w-0 flex-1 bg-transparent outline-none",
              field.kind === "select" ? "text-left" : "text-right",
            )}
          />
          {field.kind === "select" ? (
            <ChevronDown className="size-5 shrink-0 text-gray-800" />
          ) : null}
        </span>
        {field.suffix ? (
          <span className="text-h-18-semibold tracking-normal text-gray-900">
            {field.suffix}
          </span>
        ) : null}
      </span>
    </label>
  );
}
