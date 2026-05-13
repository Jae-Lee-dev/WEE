"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Segment } from "@/shared/ui/segment";
import {
  TagSearchPicker,
  type TagSearchPickerOption,
} from "@/shared/ui/tag-search-picker";
import { Textarea } from "@/shared/ui/textarea";
import { cn } from "@/shared/lib/utils";
import {
  countWorkerApplicationRows,
  createWorkerApplicationsDataSource,
  emptyWorkerApplicationsData,
  workerApplicationsCountChangedEvent,
  type ApproveWorkerApplicationInput,
  type RejectWorkerApplicationInput,
  type WorkerApplicationsDataSource,
} from "../api/worker-applications-data-source";
import {
  workerApplicationInfo,
  workerApplicationPaySettings,
  type WorkerApplicationsData,
  type WorkerApplicationPayKind,
  type WorkerApplicationRow,
  type WorkerApplicationTag,
} from "../model/worker-applications-fixtures";

const fixedWorkerApplicationTaxRatePercent = 3.3;
const draftWorkerTagValuePrefix = "draft-worker-tag:";

export function WorkerApplicationsScreen({
  dataSource: dataSourceProp,
}: {
  dataSource?: WorkerApplicationsDataSource;
} = {}) {
  const fallbackDataSource = useMemo(
    () => createWorkerApplicationsDataSource(),
    [],
  );
  const dataSource = dataSourceProp ?? fallbackDataSource;
  const [applicationData, setApplicationData] = useState<WorkerApplicationsData>(
    dataSource.initialData ?? emptyWorkerApplicationsData,
  );
  const [selectedApplicationId, setSelectedApplicationId] = useState<
    string | undefined
  >();
  const [payKind, setPayKind] = useState<WorkerApplicationPayKind>("hourly");
  const [loading, setLoading] = useState(!dataSource.initialData);
  const [savingDecision, setSavingDecision] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const selectedApplication = applicationData.rows.find(
    (row) => row.id === selectedApplicationId,
  );

  useEffect(() => {
    let active = true;

    void dataSource
      .listApplications()
      .then((nextData) => {
        if (!active) {
          return;
        }

        setApplicationData(nextData);
        publishApplicationCount(nextData.rows);
        setErrorMessage("");
        setLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setErrorMessage("소속 신청 목록을 불러오지 못했습니다.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dataSource]);

  const selectApplication = (applicationId: string) => {
    const nextApplication =
      selectedApplicationId === applicationId
        ? undefined
        : applicationData.rows.find((row) => row.id === applicationId);

    setSelectedApplicationId(nextApplication?.id);
    setPayKind(
      nextApplication ? getDefaultApplicationPayKind(nextApplication) : "hourly",
    );
    setStatusMessage("");
    setErrorMessage("");
  };

  const handleApprove = async (input: ApproveWorkerApplicationInput) => {
    setSavingDecision(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const nextData = await dataSource.approveApplication(input);

      setApplicationData(nextData);
      setSelectedApplicationId(undefined);
      publishApplicationCount(nextData.rows);
      setStatusMessage(`${input.workerName} 조교의 소속 신청을 승인했습니다.`);
    } catch {
      setErrorMessage("소속 신청을 승인하지 못했습니다.");
    } finally {
      setSavingDecision(false);
    }
  };

  const handleReject = async (input: RejectWorkerApplicationInput) => {
    setSavingDecision(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const nextData = await dataSource.rejectApplication(input);

      setApplicationData(nextData);
      publishApplicationCount(nextData.rows);
      setStatusMessage("소속 신청을 반려했습니다.");
    } catch {
      setErrorMessage("소속 신청을 반려하지 못했습니다.");
    } finally {
      setSavingDecision(false);
    }
  };

  return (
    <section
      aria-label="소속 신청"
      className="grid h-[calc(100vh-144px)] min-h-[520px] w-full grid-cols-[minmax(520px,1fr)_minmax(380px,560px)] gap-4"
      data-testid="worker-applications-screen"
      data-worker-applications-state={
        selectedApplication
          ? `${selectedApplication.id}:${payKind}`
          : "default"
      }
    >
      {statusMessage ? (
        <div className="sr-only" role="status">
          {statusMessage}
        </div>
      ) : null}
      <ApplicationList
        errorMessage={errorMessage}
        loading={loading}
        rows={applicationData.rows}
        selectedApplicationId={selectedApplicationId}
        onSelect={selectApplication}
      />
      <ApplicationDecisionPanel
        key={selectedApplication?.id ?? "empty"}
        errorMessage={errorMessage}
        onApprove={(input) => {
          void handleApprove(input);
        }}
        onReject={(input) => {
          void handleReject(input);
        }}
        selectedApplication={selectedApplication}
        saving={savingDecision}
        statusMessage={statusMessage}
        tags={applicationData.tags}
        payKind={payKind}
        onSelectPayKind={setPayKind}
      />
    </section>
  );
}

function ApplicationList({
  errorMessage,
  loading,
  rows,
  selectedApplicationId,
  onSelect,
}: {
  errorMessage: string;
  loading: boolean;
  rows: readonly WorkerApplicationRow[];
  selectedApplicationId?: string;
  onSelect: (applicationId: string) => void;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-[8px] bg-white">
      <div className="flex h-[56px] items-center gap-3 px-4">
        <h2 className="text-h-20 text-gray-900">신청 목록</h2>
        <Badge variant="grey" size="M" data-testid="worker-application-list-count">
          {rows.length}건
        </Badge>
      </div>

      <div className="grid h-9 grid-cols-[28%_28%_1fr] items-center border-b border-gray-300 px-4 text-h-18-regular text-gray-500">
        <div>이름</div>
        <div>연락처</div>
        <div>신청일</div>
      </div>

      <div>
        {loading ? (
          <ApplicationListState label="소속 신청 목록을 불러오는 중입니다." />
        ) : errorMessage ? (
          <ApplicationListState label={errorMessage} role="alert" />
        ) : rows.length > 0 ? (
          rows.map((row, index) => {
            const selected = row.id === selectedApplicationId;

            return (
              <button
                type="button"
                key={row.id}
                data-testid={`worker-application-row-${index + 1}`}
                data-selected={selected ? "true" : undefined}
                aria-pressed={selected}
                aria-label={`${row.name} 소속 신청 ${selected ? "선택 취소" : "선택"}`}
                onClick={() => onSelect(row.id)}
                className={cn(
                  "grid h-11 w-full grid-cols-[28%_28%_1fr] items-center border-b border-gray-100 px-4 text-left text-h-18-regular text-gray-900 transition-colors duration-150 ease-out last:border-b-0 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-400",
                  selected &&
                    "bg-green-50 ring-2 ring-inset ring-green-400 hover:bg-green-50",
                )}
              >
                <div className="min-w-0 truncate">{row.name}</div>
                <div className="min-w-0 truncate">{row.phone}</div>
                <div className="min-w-0 truncate">{row.appliedAt}</div>
              </button>
            );
          })
        ) : (
          <ApplicationListState label="표시할 소속 신청이 없습니다." />
        )}
      </div>
    </div>
  );
}

function ApplicationListState({
  label,
  role = "status",
}: {
  label: string;
  role?: "alert" | "status";
}) {
  return (
    <div
      className="flex min-h-[220px] items-center justify-center px-4 text-center text-h-18-regular text-gray-500"
      role={role}
    >
      {label}
    </div>
  );
}

function publishApplicationCount(rows: readonly WorkerApplicationRow[]) {
  window.dispatchEvent(
    new CustomEvent(workerApplicationsCountChangedEvent, {
      detail: {
        count: countWorkerApplicationRows(rows),
      },
    }),
  );
}

function ApplicationDecisionPanel({
  errorMessage,
  onApprove,
  onReject,
  selectedApplication,
  saving,
  statusMessage,
  tags,
  payKind,
  onSelectPayKind,
}: {
  errorMessage: string;
  onApprove: (input: ApproveWorkerApplicationInput) => void;
  onReject: (input: RejectWorkerApplicationInput) => void;
  selectedApplication: WorkerApplicationRow | undefined;
  saving: boolean;
  statusMessage: string;
  tags: readonly WorkerApplicationTag[];
  payKind: WorkerApplicationPayKind;
  onSelectPayKind: (payKind: WorkerApplicationPayKind) => void;
}) {
  const requested = selectedApplication?.info?.requestedPay ?? "";
  const [selectedTagValues, setSelectedTagValues] = useState<readonly string[]>(
    selectedApplication?.tagIds ?? [],
  );
  const [draftTagOptions, setDraftTagOptions] = useState<
    readonly TagSearchPickerOption[]
  >([]);
  const [payAmount, setPayAmount] = useState(extractFirstNumber(requested));
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const workerTagOptions = useMemo(
    () => [
      ...tags.map((tag) => ({ label: tag.label, value: tag.id })),
      ...draftTagOptions,
    ],
    [draftTagOptions, tags],
  );
  const existingTagIds = useMemo(() => new Set(tags.map((tag) => tag.id)), [tags]);
  const workerTagOptionByValue = useMemo(
    () => new Map(workerTagOptions.map((option) => [option.value, option])),
    [workerTagOptions],
  );
  const selectedTagIds = selectedTagValues.filter((tagValue) =>
    existingTagIds.has(tagValue),
  );
  const newTagLabels = selectedTagValues
    .filter((tagValue) => !existingTagIds.has(tagValue))
    .map((tagValue) => workerTagOptionByValue.get(tagValue)?.label)
    .filter((label): label is string => Boolean(label));
  const selectedTagCount = selectedTagIds.length + newTagLabels.length;
  const normalizedPayAmount = parsePositiveInt(payAmount);
  const canApprove =
    Boolean(selectedApplication?.workerId ?? selectedApplication?.id) &&
    selectedTagCount > 0 &&
    normalizedPayAmount !== null;

  if (!selectedApplication) {
    return (
      <aside className="flex min-w-0 items-center justify-center rounded-[8px] border border-transparent bg-white px-6 text-center">
        <p className="text-h-18-regular text-gray-400">
          신청 건을 선택하면
          <br />
          우측에서 승인/반려를 처리합니다.
        </p>
      </aside>
    );
  }

  return (
    <aside className="flex min-w-0 flex-col overflow-hidden rounded-[8px] border border-transparent bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4">
        <h2 className="text-h-20 text-gray-900">소속 승인</h2>
        <div className="mt-5 flex flex-col gap-4">
          <ApplicationInfoCard info={selectedApplication.info} />
          <WorkerTagCard
            error={submitted && selectedTagCount === 0}
            options={workerTagOptions}
            selectedValues={selectedTagValues}
            onCreateTag={(label) => {
              const option = createDraftWorkerTagOption(label, workerTagOptions);

              setDraftTagOptions((currentOptions) =>
                mergeTagSearchPickerOptions(currentOptions, [option]),
              );

              return option;
            }}
            onValueChange={setSelectedTagValues}
          />
          <PaySettingCard
            amount={payAmount}
            amountError={submitted && normalizedPayAmount === null}
            payKind={payKind}
            onAmountChange={setPayAmount}
            onSelectPayKind={onSelectPayKind}
          />
          {statusMessage || errorMessage ? (
            <p
              className={cn(
                "text-h-16-medium",
                statusMessage ? "text-green-500" : "text-red-500",
              )}
              role={statusMessage ? "status" : "alert"}
            >
              {statusMessage || errorMessage}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-auto flex h-16 shrink-0 items-center justify-end gap-3 px-4 pb-4 pt-4">
        <Button
          type="button"
          variant="danger"
          disabled={saving}
          onClick={() => setRejectDialogOpen(true)}
          className="h-11 rounded-[8px] px-6 text-h-16-semibold"
        >
          {saving ? "처리 중" : "반려"}
        </Button>
        <Button
          type="button"
          disabled={saving}
          onClick={() => {
            setSubmitted(true);

            if (!canApprove || normalizedPayAmount === null) {
              return;
            }

            onApprove({
              applicationId: selectedApplication.id,
              hourlyRate: payKind === "hourly" ? normalizedPayAmount : null,
              membershipId: selectedApplication.membershipId,
              monthlySalary:
                payKind === "monthly" ? normalizedPayAmount : null,
              newTagLabels,
              payrollType: payKind,
              tagIds: selectedTagIds,
              taxRatePercent: fixedWorkerApplicationTaxRatePercent,
              workerId: selectedApplication.workerId ?? selectedApplication.id,
              workerName: selectedApplication.name,
            });
          }}
          className="h-11 rounded-[8px] px-7 text-h-16-semibold"
        >
          {saving ? "처리 중" : "승인 완료"}
        </Button>
      </div>

      {rejectDialogOpen ? (
        <ApplicationRejectDialog
          reason={rejectionReason}
          saving={saving}
          workerName={selectedApplication.name}
          onChangeReason={setRejectionReason}
          onClose={() => setRejectDialogOpen(false)}
          onConfirm={() => {
            onReject({
              applicationId: selectedApplication.id,
              membershipId: selectedApplication.membershipId,
              rejectionReason: rejectionReason.trim(),
              workerId: selectedApplication.workerId ?? selectedApplication.id,
            });
            setRejectDialogOpen(false);
          }}
        />
      ) : null}
    </aside>
  );
}

function ApplicationInfoCard({
  info = workerApplicationInfo,
}: {
  info?: WorkerApplicationRow["info"];
}) {
  return (
    <section className="rounded-[8px] border border-gray-100 px-4 py-4">
      <h3 className="text-h-18-semibold text-gray-900">신청 정보</h3>
      <dl className="mt-4 space-y-3 text-h-18-regular text-gray-900">
        <InfoRow label="신청일" value={info.appliedAt} />
        <InfoRow label="통장 사본" value={info.bankbookStatus} />
        <InfoRow label="희망 급여" value={info.requestedPay} />
        {info.statusText ? (
          <InfoRow label="처리 상태" value={info.statusText} />
        ) : null}
        {info.rejectionReason ? (
          <InfoRow label="반려 사유" value={info.rejectionReason} />
        ) : null}
      </dl>
      <div className="mt-5 flex justify-end">
        {info.bankbookDownloadUrl ? (
          <a
            href={info.bankbookDownloadUrl}
            target="_blank"
            rel="noreferrer"
            download
            className="flex h-9 items-center justify-center rounded-full border border-gray-200 bg-white px-4 text-h-16-medium text-gray-800 transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
          >
            통장 사본 다운로드
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="flex h-9 cursor-not-allowed items-center justify-center rounded-full border border-gray-200 bg-gray-50 px-4 text-h-16-medium text-gray-400"
          >
            통장 사본 다운로드
          </button>
        )}
      </div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[74px_1fr] gap-2">
      <dt className="font-semibold text-gray-800">{label}</dt>
      <dd className="min-w-0 truncate text-gray-900">{value}</dd>
    </div>
  );
}

function WorkerTagCard({
  error,
  onCreateTag,
  onValueChange,
  options,
  selectedValues,
}: {
  error: boolean;
  onCreateTag: (label: string) => TagSearchPickerOption;
  onValueChange: (value: readonly string[]) => void;
  options: readonly TagSearchPickerOption[];
  selectedValues: readonly string[];
}) {
  return (
    <section className="relative z-20 rounded-[8px] border border-gray-100 px-4 py-4">
      <h3 className="text-h-18-semibold text-gray-900">
        근무자 태그 <span className="text-red-500">*</span>
      </h3>

      <TagSearchPicker
        allowCreate
        closeOnSelect
        className="mt-3"
        createLabel={(query) => (
          <>
            새 태그 <span className="font-semibold text-gray-900">{query}</span>
            <span> 선택</span>
          </>
        )}
        data-testid="worker-application-tag-picker"
        emptyMessage="일치하는 근무자 태그가 없습니다."
        inputAriaLabel="근무자 태그 검색"
        invalid={error}
        listboxClassName="z-30"
        options={options}
        placeholder="태그를 검색하거나 새 태그를 입력하세요"
        triggerClassName="min-h-11 rounded-[8px] border-gray-200 px-4"
        value={selectedValues}
        onCreateOption={onCreateTag}
        onValueChange={(value) => onValueChange(value)}
      />

      {error ? (
        <p className="mt-2 text-label-12-medium text-red-500">
          근무자 태그를 1개 이상 선택하거나 추가해 주세요.
        </p>
      ) : null}
    </section>
  );
}

function PaySettingCard({
  amount,
  amountError,
  payKind,
  onAmountChange,
  onSelectPayKind,
}: {
  amount: string;
  amountError: boolean;
  payKind: WorkerApplicationPayKind;
  onAmountChange: (value: string) => void;
  onSelectPayKind: (payKind: WorkerApplicationPayKind) => void;
}) {
  const setting = workerApplicationPaySettings[payKind];

  return (
    <section className="rounded-[8px] border border-gray-100 px-4 py-4">
      <h3 className="text-h-18-semibold text-gray-900">
        급여 설정 <span className="text-red-500">*</span>
      </h3>
      <Segment
        className="mt-3 grid h-11 w-full grid-cols-2 [&_[data-slot=tabs-trigger]]:h-9 [&_[data-slot=tabs-trigger]]:py-0"
        options={[
          {
            value: "hourly",
            label: "시급",
            testId: "worker-application-pay-hourly",
          },
          {
            value: "monthly",
            label: "월급",
            testId: "worker-application-pay-monthly",
          },
        ]}
        value={payKind}
        onChange={onSelectPayKind}
      />

      <div className="mt-4 flex items-center gap-3">
        <Input
          inputMode="numeric"
          value={amount}
          onChange={(event) => onAmountChange(event.target.value)}
          placeholder={setting.placeholder}
          aria-invalid={amountError}
          className="h-11 min-w-0 flex-1 rounded-[8px] border-gray-200 bg-gray-50 text-h-18-regular text-gray-900"
          aria-label="급여 입력"
        />
        <span className="w-[52px] shrink-0 text-right text-h-18-regular text-gray-900">
          {setting.unit}
        </span>
      </div>

      <div className="mt-4 flex min-h-[48px] items-center gap-3 border-t border-gray-100 pt-4">
        <span className="shrink-0 text-h-18-semibold text-gray-800">세율</span>
        <Badge
          variant="greenSolid"
          size="L"
          shape="pill"
          className="px-4"
        >
          {fixedWorkerApplicationTaxRatePercent}%
        </Badge>
      </div>
      {amountError ? (
        <p className="mt-2 text-label-12-medium text-red-500">
          급여 금액을 입력해 주세요.
        </p>
      ) : null}
    </section>
  );
}

function ApplicationRejectDialog({
  onChangeReason,
  onClose,
  onConfirm,
  reason,
  saving,
  workerName,
}: {
  onChangeReason: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  reason: string;
  saving: boolean;
  workerName: string;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex w-[calc(100vw-32px)] max-w-[520px] flex-col rounded-[8px] bg-white p-8 text-gray-900 shadow-[0px_16px_44px_rgba(17,24,39,0.18)] ring-0"
      >
        <DialogHeader className="gap-3">
          <DialogTitle className="text-h-20 text-gray-900">
            소속 신청 반려
          </DialogTitle>
          <DialogDescription className="text-h-18-regular text-gray-600">
            {workerName} 조교에게 전달할 반려 사유를 입력합니다.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(event) => onChangeReason(event.target.value)}
          placeholder="반려 사유를 입력해 주세요"
          className="mt-5 h-[120px] min-h-0 w-full rounded-[8px] border-gray-200 bg-gray-50 text-h-18-regular text-gray-900"
        />
        <DialogFooter className="-mx-0 -mb-0 mt-6 flex-row justify-end gap-3 rounded-none border-0 bg-transparent p-0">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={onClose}
            className="h-11 rounded-[8px] px-6"
          >
            취소
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={saving}
            onClick={onConfirm}
            className="h-11 rounded-[8px] px-6"
          >
            {saving ? "처리 중" : "반려 확정"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function extractFirstNumber(value: string) {
  return value.replace(/[^\d]/g, "");
}

function getDefaultApplicationPayKind(
  application: WorkerApplicationRow,
): WorkerApplicationPayKind {
  return application.info?.requestedPay?.includes("월급") ? "monthly" : "hourly";
}

function createDraftWorkerTagOption(
  label: string,
  options: readonly TagSearchPickerOption[],
): TagSearchPickerOption {
  const normalizedLabel = label.trim().replace(/\s+/g, " ");
  const baseValue =
    normalizeDraftWorkerTagLabel(normalizedLabel)
      .replace(/[^a-z0-9가-힣]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "tag";
  const optionValues = new Set(options.map((option) => option.value));
  let value = `${draftWorkerTagValuePrefix}${baseValue}`;
  let index = 2;

  while (optionValues.has(value)) {
    value = `${draftWorkerTagValuePrefix}${baseValue}-${index}`;
    index += 1;
  }

  return { label: normalizedLabel, value };
}

function mergeTagSearchPickerOptions(
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

function normalizeDraftWorkerTagLabel(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
}

function parsePositiveInt(value: string) {
  const parsed = Number(value.replace(/[^\d]/g, ""));

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
