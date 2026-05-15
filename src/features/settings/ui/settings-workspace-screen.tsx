"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { useWeeErrorToast } from "@/shared/ui/wee-toast";
import {
  createSettingsWorkspaceDataSource,
  type SettingsWorkspace,
  type SettingsWorkspaceDataSource,
  type UpdateSettingsWorkspaceInput,
} from "@/entities/workspace";
import {
  settingsWorkspaceFixture,
  type SettingsWorkspaceInfoRow,
} from "@/entities/workspace";

type SettingsWorkspaceScreenProps = {
  dataSource?: SettingsWorkspaceDataSource;
};

type WorkspaceFormState = UpdateSettingsWorkspaceInput;
type WorkspaceFormField = keyof WorkspaceFormState;
type WorkspaceFormErrors = Partial<Record<WorkspaceFormField, string>>;

const workspaceDialogFields: {
  id: WorkspaceFormField;
  label: string;
}[] = [
  { id: "name", label: "소속 이름" },
  { id: "businessNumber", label: "사업자등록번호" },
  { id: "ownerName", label: "대표자명" },
  { id: "contact", label: "연락처" },
];

export function SettingsWorkspaceScreen({
  dataSource: dataSourceProp,
}: SettingsWorkspaceScreenProps = {}) {
  const fallbackDataSource = useMemo(
    () => createSettingsWorkspaceDataSource(),
    [],
  );
  const dataSource = dataSourceProp ?? fallbackDataSource;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [workspace, setWorkspace] = useState<SettingsWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  useWeeErrorToast(errorMessage, { title: "요청 실패" });

  useEffect(() => {
    let active = true;

    void dataSource
      .getWorkspace()
      .then((nextWorkspace) => {
        if (!active) {
          return;
        }

        setWorkspace(nextWorkspace);
        setLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setErrorMessage("소속 정보를 불러오지 못했습니다.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dataSource]);

  const rows = workspace
    ? createWorkspaceInfoRows(workspace)
    : createPlaceholderWorkspaceRows(loading);

  const handleSaveWorkspace = async (input: UpdateSettingsWorkspaceInput) => {
    setSaving(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const nextWorkspace = await dataSource.updateWorkspace(input);

      setWorkspace(nextWorkspace);
      setDialogOpen(false);
      setStatusMessage("소속 정보를 수정했습니다.");
    } catch {
      setErrorMessage("소속 정보를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      aria-label="소속 설정"
      className="mx-auto h-[calc(100vh-144px)] min-h-[520px] w-full max-w-[1480px] overflow-hidden rounded-[10px] border border-gray-200 bg-white p-4 tracking-normal"
      data-testid="settings-workspace-screen"
    >
      <div className="flex h-full flex-col items-end gap-6">
        <div className="flex w-full flex-col gap-3">
          {rows.map((row) => (
            <WorkspaceInfoRow key={row.id} row={row} />
          ))}
        </div>

        {statusMessage ? (
          <p
            className="mr-auto text-label-14-medium text-green-500"
            role="status"
          >
            {statusMessage}
          </p>
        ) : null}

        <Button
          type="button"
          data-testid="settings-workspace-edit-trigger"
          disabled={!workspace || saving}
          onClick={() => setDialogOpen(true)}
          className="h-9 rounded-full px-4 text-h-18-regular font-medium tracking-normal text-white"
        >
          정보 수정
        </Button>
      </div>

      {dialogOpen ? (
        <WorkspaceEditDialog
          saving={saving}
          workspace={workspace}
          onClose={() => setDialogOpen(false)}
          onSave={handleSaveWorkspace}
        />
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

function WorkspaceEditDialog({
  onClose,
  onSave,
  saving,
  workspace,
}: {
  onClose: () => void;
  onSave: (input: UpdateSettingsWorkspaceInput) => Promise<void>;
  saving: boolean;
  workspace: SettingsWorkspace | null;
}) {
  const { dialog } = settingsWorkspaceFixture;
  const [form, setForm] = useState<WorkspaceFormState>(() =>
    createWorkspaceFormState(workspace),
  );
  const [errors, setErrors] = useState<WorkspaceFormErrors>({});

  const handleFieldChange =
    (field: WorkspaceFormField) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
      setErrors((current) => ({
        ...current,
        [field]: undefined,
      }));
    };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = getWorkspaceFormErrors(form);

    if (hasWorkspaceFormErrors(nextErrors)) {
      setErrors(nextErrors);
      return;
    }

    void onSave({
      businessNumber: normalizeBusinessNumber(form.businessNumber),
      contact: form.contact.trim(),
      name: form.name.trim(),
      ownerName: form.ownerName.trim(),
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        data-testid="settings-workspace-dialog"
        className="flex max-h-[calc(100dvh-48px)] w-[calc(100vw-32px)] max-w-[620px] flex-col rounded-[8px] bg-white p-8 text-gray-900 shadow-[0px_16px_44px_rgba(17,24,39,0.18)] ring-0 sm:max-w-[620px]"
      >
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogTitle
            id="settings-workspace-dialog-title"
            className="text-h-20 text-gray-900"
          >
            {dialog.title}
          </DialogTitle>

          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 overflow-y-auto pr-1">
            {workspaceDialogFields.map((field) => (
              <WorkspaceDialogField
                key={field.id}
                error={errors[field.id]}
                field={field}
                value={form[field.id]}
                onChange={handleFieldChange(field.id)}
              />
            ))}
          </div>

          <DialogFooter className="-mx-0 -mb-0 mt-auto flex-row justify-end gap-3 rounded-none border-0 bg-transparent p-0">
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={onClose}
              className="h-11 rounded-[8px] px-6 text-h-18-semibold tracking-normal"
            >
              {dialog.cancelLabel}
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="h-11 rounded-[8px] px-6 text-h-18-semibold tracking-normal text-white"
            >
              {saving ? "저장 중" : dialog.saveLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WorkspaceDialogField({
  error,
  field,
  onChange,
  value,
}: {
  error?: string;
  field: { id: WorkspaceFormField; label: string };
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-h-18-semibold text-gray-900">{field.label}</span>
      <Input
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error)}
        className="mt-3 h-11 w-full rounded-[8px] border-gray-200 bg-white text-h-18-regular text-gray-800"
      />
      <span className="mt-1 block min-h-4 text-label-12-regular text-red-500">
        {error ?? ""}
      </span>
    </label>
  );
}

function createWorkspaceInfoRows(
  workspace: SettingsWorkspace,
): SettingsWorkspaceInfoRow[] {
  return [
    { id: "workspace-name", label: "소속 이름", value: workspace.name || "-" },
    { id: "invite-code", label: "참여 코드", value: workspace.code || "-" },
    {
      id: "manager",
      label: "관리자",
      value: workspace.managerName || workspace.ownerName || "-",
    },
    {
      id: "business-number",
      label: "사업자등록번호",
      value: formatBusinessNumber(workspace.businessNumber),
    },
    { id: "owner-name", label: "대표자명", value: workspace.ownerName || "-" },
    { id: "phone", label: "연락처", value: workspace.contact || "-" },
  ];
}

function createPlaceholderWorkspaceRows(
  loading: boolean,
): readonly SettingsWorkspaceInfoRow[] {
  return settingsWorkspaceFixture.rows.map((row) => ({
    ...row,
    value: loading ? "불러오는 중" : "-",
  }));
}

function createWorkspaceFormState(
  workspace: SettingsWorkspace | null,
): WorkspaceFormState {
  if (workspace) {
    return {
      businessNumber: formatBusinessNumber(workspace.businessNumber),
      contact: workspace.contact,
      name: workspace.name,
      ownerName: workspace.ownerName,
    };
  }

  const fields = Object.fromEntries(
    settingsWorkspaceFixture.dialog.fields.map((field) => [field.id, field.value]),
  ) as Record<string, string>;

  return {
    businessNumber: fields["business-number"] ?? "",
    contact: fields.phone ?? "",
    name: fields["workspace-name"] ?? "",
    ownerName: "",
  };
}

function getWorkspaceFormErrors(form: WorkspaceFormState): WorkspaceFormErrors {
  const errors: WorkspaceFormErrors = {};

  if (!form.name.trim()) {
    errors.name = "소속 이름을 입력해 주세요.";
  }

  if (normalizeBusinessNumber(form.businessNumber).length !== 10) {
    errors.businessNumber = "사업자등록번호 10자리를 입력해 주세요.";
  }

  if (!form.ownerName.trim()) {
    errors.ownerName = "대표자명을 입력해 주세요.";
  }

  if (!form.contact.trim()) {
    errors.contact = "연락처를 입력해 주세요.";
  }

  return errors;
}

function hasWorkspaceFormErrors(errors: WorkspaceFormErrors) {
  return Object.values(errors).some(Boolean);
}

function normalizeBusinessNumber(value: string) {
  return value.replace(/\D/g, "");
}

function formatBusinessNumber(value: string) {
  const digits = normalizeBusinessNumber(value);

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }

  return value || "-";
}
