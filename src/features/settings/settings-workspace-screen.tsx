"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  settingsWorkspaceFixture,
  type SettingsWorkspaceField,
  type SettingsWorkspaceInfoRow,
} from "./settings-workspace-fixtures";

export function SettingsWorkspaceScreen() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <section
      aria-label="사업장 설정"
      className="mx-auto h-[calc(100vh-202px)] min-h-[620px] w-full max-w-[1580px] overflow-hidden rounded-[10px] border border-gray-200 bg-white p-5 tracking-normal"
      data-testid="settings-workspace-screen"
    >
      <div className="flex h-full flex-col items-end gap-6">
        <div className="flex w-full flex-col gap-3">
          {settingsWorkspaceFixture.rows.map((row) => (
            <WorkspaceInfoRow key={row.id} row={row} />
          ))}
        </div>

        <Button
          type="button"
          data-testid="settings-workspace-edit-trigger"
          onClick={() => setDialogOpen(true)}
          className="h-[42px] rounded-full px-4 text-h-18-regular font-medium tracking-normal text-white"
        >
          정보 수정
        </Button>
      </div>

      {dialogOpen ? (
        <WorkspaceEditDialog onClose={() => setDialogOpen(false)} />
      ) : null}
    </section>
  );
}

function WorkspaceInfoRow({ row }: { row: SettingsWorkspaceInfoRow }) {
  return (
    <div className="flex h-14 items-center justify-between rounded-[10px] border border-gray-200 bg-white px-4 text-h-18-semibold">
      <span className="text-gray-500">{row.label}</span>
      <span className="text-h-18-regular font-medium text-gray-800">
        {row.value}
      </span>
    </div>
  );
}

function WorkspaceEditDialog({ onClose }: { onClose: () => void }) {
  const { dialog } = settingsWorkspaceFixture;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-workspace-dialog-title"
        className="flex h-[548px] w-[680px] flex-col rounded-[8px] bg-white px-10 py-10 shadow-[0px_16px_44px_rgba(17,24,39,0.18)]"
        data-testid="settings-workspace-dialog"
      >
        <h2 id="settings-workspace-dialog-title" className="text-h-20 text-gray-900">
          {dialog.title}
        </h2>

        <div className="mt-10 flex flex-col gap-8">
          {dialog.fields.map((field) => (
            <WorkspaceDialogField key={field.id} field={field} />
          ))}
        </div>

        <div className="mt-auto flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="h-[50px] rounded-[8px] px-6 text-h-18-semibold tracking-normal"
          >
            {dialog.cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onClose}
            className="h-[50px] rounded-[8px] px-6 text-h-18-semibold tracking-normal text-white"
          >
            {dialog.saveLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}

function WorkspaceDialogField({ field }: { field: SettingsWorkspaceField }) {
  return (
    <label className="block">
      <span className="text-h-18-semibold text-gray-900">{field.label}</span>
      <input
        readOnly
        value={field.value}
        className="mt-3 h-[49px] w-full rounded-[8px] border border-gray-200 bg-gray-50 px-4 text-h-18-regular text-gray-800 outline-none"
      />
    </label>
  );
}
