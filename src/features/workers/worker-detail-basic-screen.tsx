"use client";

import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WorkerDetailShell } from "./worker-detail-shell";
import {
  workerDetailBasicFixture,
  type BasicInfoRow,
  type DeleteBlocker,
  type DeleteBlockerTone,
  type EditInfoField,
  type PayrollSettingRow,
} from "./worker-detail-basic-fixtures";

type DialogState = "edit-info" | "delete-blocked" | null;

const blockerToneClassName: Record<DeleteBlockerTone, string> = {
  red: "bg-red-50 text-red-500",
  orange: "bg-orange-100 text-orange-400",
  blue: "bg-blue-50 text-blue-500",
};

export function WorkerDetailBasicScreen() {
  const [dialog, setDialog] = useState<DialogState>(null);

  return (
    <div
      onClick={(event) => {
        const target = event.target;
        if (
          target instanceof HTMLElement &&
          target.closest("button")?.textContent?.trim() === "조교 삭제"
        ) {
          setDialog("delete-blocked");
        }
      }}
      data-testid="worker-detail-basic-screen"
    >
      <WorkerDetailShell activeTab="basic">
        <div className="grid grid-cols-2 gap-5">
          <PersonalAccountCard onEdit={() => setDialog("edit-info")} />
          <PayrollSettingsCard />
        </div>
      </WorkerDetailShell>

      {dialog === "edit-info" ? (
        <EditInfoDialog onClose={() => setDialog(null)} />
      ) : null}
      {dialog === "delete-blocked" ? (
        <DeleteBlockedDialog onClose={() => setDialog(null)} />
      ) : null}
    </div>
  );
}

function PersonalAccountCard({ onEdit }: { onEdit: () => void }) {
  const fixture = workerDetailBasicFixture;

  return (
    <section className="flex min-h-[501px] flex-col gap-5 overflow-hidden rounded-[8px] border border-gray-100 bg-white p-5">
      <div className="flex min-h-[41px] items-center justify-between gap-4">
        <h2 className="text-h-20 text-gray-900">{fixture.personalTitle}</h2>
        <div className="flex items-center gap-3">
          <PillButton>{fixture.bankCopyLabel}</PillButton>
          <PillButton onClick={onEdit} testId="worker-basic-edit-trigger">
            {fixture.editLabel}
          </PillButton>
        </div>
      </div>

      <div>
        {fixture.personalRows.map((row, index) => (
          <InfoRow
            key={row.id}
            row={row}
            last={index === fixture.personalRows.length - 1}
          />
        ))}
      </div>
    </section>
  );
}

function PayrollSettingsCard() {
  const fixture = workerDetailBasicFixture;

  return (
    <section className="flex min-h-[501px] flex-col gap-5 overflow-hidden rounded-[8px] border border-gray-100 bg-white p-5">
      <div className="flex h-[41px] items-center">
        <h2 className="text-h-20 text-gray-900">{fixture.payrollTitle}</h2>
      </div>

      <div>
        {fixture.payrollRows.map((row, index) => (
          <PayrollRow
            key={row.id}
            row={row}
            last={index === fixture.payrollRows.length - 1}
          />
        ))}
      </div>
    </section>
  );
}

function PillButton({
  children,
  onClick,
  testId,
}: {
  children: string;
  onClick?: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className="flex h-[42px] items-center justify-center rounded-full border border-gray-200 bg-white px-4 text-h-18-regular font-medium text-gray-700 transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
    >
      {children}
    </button>
  );
}

function InfoRow({ row, last }: { row: BasicInfoRow; last: boolean }) {
  return (
    <div
      className={cn(
        "flex min-h-[57px] items-center justify-between py-4 text-h-18-semibold",
        !last && "border-b border-gray-200",
      )}
    >
      <span className="text-gray-500">{row.label}</span>
      {row.kind === "badge" ? (
        <Badge
          variant={row.tone === "green" ? "green" : "grey"}
          size="M"
          style={row.tone === "green" ? { color: "var(--color-green-400)" } : undefined}
        >
          {row.value}
        </Badge>
      ) : (
        <span className="text-h-18-regular font-medium text-gray-800">
          {row.value}
        </span>
      )}
    </div>
  );
}

function PayrollRow({ row, last }: { row: PayrollSettingRow; last: boolean }) {
  return (
    <div
      className={cn(
        "flex min-h-[57px] items-center justify-between py-4 text-h-18-semibold",
        !last && "border-b border-gray-200",
      )}
    >
      <span className="text-gray-500">{row.label}</span>
      <span className="text-h-18-regular font-medium text-gray-800">
        {row.value}
      </span>
    </div>
  );
}

function EditInfoDialog({ onClose }: { onClose: () => void }) {
  const dialog = workerDetailBasicFixture.editDialog;

  return (
    <DialogBackdrop>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="worker-edit-info-dialog-title"
        className="flex w-[680px] flex-col gap-10 rounded-[8px] bg-white p-10 shadow-[0px_16px_44px_rgba(17,24,39,0.18)]"
        data-testid="worker-edit-info-dialog"
      >
        <h2 id="worker-edit-info-dialog-title" className="text-h-20 text-gray-900">
          {dialog.title}
        </h2>

        <div className="flex flex-col gap-8">
          <DialogField field={dialog.fields[0]} />
          <DialogField field={dialog.fields[1]} />

          <div className="grid grid-cols-2 gap-5">
            <DialogField field={dialog.fields[2]} />
            <DialogField field={dialog.fields[3]} />
          </div>

          <div className="flex w-[292px] flex-col gap-2">
            <span className="text-h-18-semibold text-gray-900">
              {dialog.tagLabel}
            </span>
            <div className="flex items-center gap-3">
              <span className="rounded-[4px] bg-gray-100 px-2.5 py-1 text-h-18-semibold text-gray-600">
                {dialog.tagValue}
              </span>
              <span className="rounded-[4px] bg-gray-100 px-2.5 py-1 text-h-18-semibold text-gray-600">
                {dialog.addTagLabel}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-h-18-semibold text-gray-900">
              {dialog.payTypeLabel}
            </span>
            <div className="grid h-[57px] grid-cols-2 rounded-[8px] border border-gray-200 bg-white p-1">
              <button
                type="button"
                className="rounded-[8px] bg-green-400 text-h-18-semibold text-white"
              >
                {dialog.payTypeOptions[0]}
              </button>
              <button
                type="button"
                className="rounded-[8px] text-h-18-semibold text-gray-700"
              >
                {dialog.payTypeOptions[1]}
              </button>
            </div>
            <p className="text-detail-16-regular text-gray-600">
              {dialog.payTypeNote}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
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
            className="h-[50px] rounded-[8px] px-6 text-h-18-semibold tracking-normal text-white"
          >
            {dialog.saveLabel}
          </Button>
        </div>
      </section>
    </DialogBackdrop>
  );
}

function DialogField({ field }: { field: EditInfoField }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-h-18-semibold text-gray-900">{field.label}</span>
      <input
        readOnly
        value={field.value}
        className="h-[49px] rounded-[8px] border-0 bg-gray-100 px-4 text-h-18-regular text-gray-400 outline-none"
      />
    </label>
  );
}

function DeleteBlockedDialog({ onClose }: { onClose: () => void }) {
  const dialog = workerDetailBasicFixture.deleteBlockedDialog;

  return (
    <DialogBackdrop>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="worker-delete-blocked-dialog-title"
        className="flex w-[560px] flex-col gap-10 rounded-[8px] bg-white p-10 shadow-[0px_16px_44px_rgba(17,24,39,0.18)]"
        data-testid="worker-delete-blocked-dialog"
      >
        <h2
          id="worker-delete-blocked-dialog-title"
          className="text-h-20 text-gray-900"
        >
          {dialog.title}
        </h2>

        <div className="text-detail-16-regular text-gray-600">
          {dialog.description.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          {dialog.blockers.map((blocker) => (
            <BlockerRow key={blocker.id} blocker={blocker} />
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={onClose}
            className="h-[50px] rounded-[8px] px-6 text-h-18-semibold tracking-normal text-white"
          >
            {dialog.confirmLabel}
          </Button>
        </div>
      </section>
    </DialogBackdrop>
  );
}

function BlockerRow({ blocker }: { blocker: DeleteBlocker }) {
  return (
    <div className="flex h-[56px] items-center gap-6 rounded-[8px] border border-gray-100 px-4">
      <span
        className={cn(
          "rounded-[4px] px-1.5 py-0.5 text-detail-16-semibold",
          blockerToneClassName[blocker.tone],
        )}
      >
        {blocker.label}
      </span>
      <span className="text-h-18-semibold text-gray-900">{blocker.value}</span>
    </div>
  );
}

function DialogBackdrop({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#9a9a9a]/80">
      {children}
    </div>
  );
}
