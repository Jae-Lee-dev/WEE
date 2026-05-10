"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconCheck, IconSearch } from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  workerApplicationInfo,
  workerApplicationPaySettings,
  workerApplicationRows,
  workerApplicationTags,
  type WorkerApplicationPayKind,
  type WorkerApplicationRow,
  type WorkerApplicationTag,
} from "./worker-applications-fixtures";

const firstApplicationId = workerApplicationRows[0]?.id;
const selectedTag = workerApplicationTags[0];

export function WorkerApplicationsScreen() {
  const [selectedApplicationId, setSelectedApplicationId] = useState<
    string | undefined
  >();
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [tagAdded, setTagAdded] = useState(false);
  const [payKind, setPayKind] = useState<WorkerApplicationPayKind>("hourly");

  const selectedApplication = workerApplicationRows.find(
    (row) => row.id === selectedApplicationId,
  );

  const selectApplication = (applicationId: string) => {
    setSelectedApplicationId((current) =>
      current === applicationId ? undefined : applicationId,
    );
    setTagMenuOpen(false);
  };

  return (
    <section
      aria-label="소속 신청"
      className="grid h-[calc(100vh-202px)] min-h-[560px] w-full grid-cols-[minmax(560px,1fr)_minmax(420px,640px)] gap-5"
      data-testid="worker-applications-screen"
      data-worker-applications-state={
        selectedApplication
          ? `${selectedApplication.id}:${tagAdded ? "tag-added" : "tag-empty"}:${payKind}`
          : "default"
      }
    >
      <ApplicationList
        rows={workerApplicationRows}
        selectedApplicationId={selectedApplicationId}
        onSelect={selectApplication}
      />
      <ApplicationDecisionPanel
        selected={Boolean(selectedApplication)}
        tagAdded={tagAdded}
        tagMenuOpen={tagMenuOpen}
        payKind={payKind}
        onOpenTagMenu={() => setTagMenuOpen((open) => !open)}
        onAddTag={() => {
          setTagAdded(true);
          setTagMenuOpen(false);
        }}
        onSelectPayKind={setPayKind}
      />
    </section>
  );
}

function ApplicationList({
  rows,
  selectedApplicationId,
  onSelect,
}: {
  rows: readonly WorkerApplicationRow[];
  selectedApplicationId?: string;
  onSelect: (applicationId: string) => void;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-[8px] bg-white">
      <div className="flex h-[70px] items-center gap-3 px-5">
        <h2 className="text-h-20 text-gray-900">신청 목록</h2>
        <Badge variant="grey" size="M">
          {rows.length}건
        </Badge>
      </div>

      <div className="grid h-[41px] grid-cols-[28%_28%_1fr_84px] items-center border-b border-gray-300 px-5 text-h-18-regular text-gray-500">
        <div>이름</div>
        <div>연락처</div>
        <div>신청일</div>
        <div aria-hidden="true" />
      </div>

      <div>
        {rows.map((row, index) => {
          const selected = row.id === selectedApplicationId;

          return (
            <div
              key={row.id}
              data-testid={`worker-application-row-${index + 1}`}
              className={cn(
                "grid h-[61px] grid-cols-[28%_28%_1fr_84px] items-center border-b border-gray-100 px-5 text-h-18-regular text-gray-900 last:border-b-0",
                selected && "bg-green-50",
              )}
            >
              <div className="min-w-0 truncate">{row.name}</div>
              <div className="min-w-0 truncate">{row.phone}</div>
              <div className="min-w-0 truncate">{row.appliedAt}</div>
              <div className="flex justify-end">
                <button
                  type="button"
                  data-testid={
                    row.id === firstApplicationId
                      ? "worker-application-first-select"
                      : undefined
                  }
                  aria-pressed={selected}
                  onClick={() => onSelect(row.id)}
                  className={cn(
                    "flex h-[42px] min-w-[64px] items-center justify-center rounded-full border px-4 text-h-16-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200",
                    selected
                      ? "border-green-400 bg-green-400 text-white hover:bg-green-450"
                      : "border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50",
                  )}
                >
                  {selected ? "취소" : "선택"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ApplicationDecisionPanel({
  selected,
  tagAdded,
  tagMenuOpen,
  payKind,
  onOpenTagMenu,
  onAddTag,
  onSelectPayKind,
}: {
  selected: boolean;
  tagAdded: boolean;
  tagMenuOpen: boolean;
  payKind: WorkerApplicationPayKind;
  onOpenTagMenu: () => void;
  onAddTag: () => void;
  onSelectPayKind: (payKind: WorkerApplicationPayKind) => void;
}) {
  if (!selected) {
    return (
      <aside className="flex min-w-0 items-center justify-center rounded-[8px] border border-gray-300 bg-white px-6 text-center">
        <p className="text-h-18-regular text-gray-400">
          신청 건을 선택하면
          <br />
          우측에서 승인/반려를 처리합니다.
        </p>
      </aside>
    );
  }

  return (
    <aside className="flex min-w-0 flex-col overflow-hidden rounded-[8px] border border-gray-300 bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5">
        <h2 className="text-h-20 text-gray-900">소속 승인</h2>
        <div className="mt-5 flex flex-col gap-5">
          <ApplicationInfoCard />
          <WorkerTagCard
            tagAdded={tagAdded}
            tagMenuOpen={tagMenuOpen}
            onOpenTagMenu={onOpenTagMenu}
            onAddTag={onAddTag}
          />
          <PaySettingCard
            payKind={payKind}
            onSelectPayKind={onSelectPayKind}
          />
        </div>
      </div>

      <div className="mt-auto flex h-[86px] shrink-0 items-center justify-end gap-3 px-5 pb-5 pt-4">
        <Button
          type="button"
          variant="danger"
          className="h-[50px] rounded-[8px] px-6 text-h-16-semibold"
        >
          반려
        </Button>
        <Button
          type="button"
          className="h-[50px] rounded-[8px] px-7 text-h-16-semibold"
        >
          승인 완료
        </Button>
      </div>
    </aside>
  );
}

function ApplicationInfoCard() {
  return (
    <section className="rounded-[8px] border border-gray-100 px-4 py-4">
      <h3 className="text-h-18-semibold text-gray-900">신청 정보</h3>
      <dl className="mt-4 space-y-3 text-h-18-regular text-gray-900">
        <InfoRow label="신청일" value={workerApplicationInfo.appliedAt} />
        <InfoRow label="통장 사본" value={workerApplicationInfo.bankbookStatus} />
        <InfoRow label="희망 급여" value={workerApplicationInfo.requestedPay} />
      </dl>
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          className="flex h-[42px] items-center justify-center rounded-full border border-gray-200 bg-white px-4 text-h-16-medium text-gray-800 transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
        >
          통장 사본 다운로드
        </button>
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
  tagAdded,
  tagMenuOpen,
  onOpenTagMenu,
  onAddTag,
}: {
  tagAdded: boolean;
  tagMenuOpen: boolean;
  onOpenTagMenu: () => void;
  onAddTag: () => void;
}) {
  return (
    <section className="relative z-20 rounded-[8px] border border-gray-100 px-4 py-4">
      <h3 className="text-h-18-semibold text-gray-900">
        근무자 태그 <span className="text-red-500">*</span>
      </h3>

      {tagAdded ? (
        <div
          className="mt-3 flex min-h-[34px] flex-wrap items-center gap-2"
          data-testid="worker-application-tag-added"
        >
          <TagPill tag={selectedTag} />
          <button
            type="button"
            data-testid="worker-application-tag-add-chip"
            onClick={onOpenTagMenu}
            className="rounded-[4px] bg-gray-100 px-2.5 py-1 text-h-16-medium text-gray-600 transition-colors duration-150 ease-out hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
          >
            태그 추가 +
          </button>
        </div>
      ) : (
        <div className="relative mt-3">
          <button
            type="button"
            aria-expanded={tagMenuOpen}
            aria-haspopup="listbox"
            data-testid="worker-application-tag-search-trigger"
            onClick={onOpenTagMenu}
            className="flex h-[49px] w-full items-center justify-between gap-3 rounded-[8px] border border-gray-200 bg-white px-4 text-left text-h-18-regular text-gray-400 transition-colors duration-150 ease-out hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
          >
            <span className="min-w-0 truncate">
              태그를 검색하거나 새 태그를 입력하세요
            </span>
            <IconSearch className="size-6 shrink-0 text-green-400" />
          </button>
          {tagMenuOpen ? <TagMenu onAddTag={onAddTag} /> : null}
        </div>
      )}

      {tagAdded && tagMenuOpen ? (
        <div className="relative mt-3">
          <TagMenu onAddTag={onAddTag} />
        </div>
      ) : null}
    </section>
  );
}

function TagPill({ tag }: { tag?: WorkerApplicationTag }) {
  return (
    <span className="rounded-[4px] bg-gray-100 px-2.5 py-1 text-h-16-medium text-gray-600">
      {tag?.label ?? "베테랑"}
    </span>
  );
}

function TagMenu({ onAddTag }: { onAddTag: () => void }) {
  return (
    <div
      role="listbox"
      aria-label="근무자 태그 선택"
      data-testid="worker-application-tag-menu"
      className="absolute left-0 top-[53px] z-30 w-full overflow-hidden rounded-[4px] border border-gray-100 bg-white px-3 shadow-[0px_8px_20px_rgba(17,24,39,0.12)]"
    >
      {workerApplicationTags.map((tag, index) => (
        <button
          key={tag.id}
          type="button"
          role="option"
          aria-selected={index === 0}
          data-testid={
            index === 0 ? "worker-application-tag-option-first" : undefined
          }
          onClick={index === 0 ? onAddTag : undefined}
          className="flex h-[49px] w-full items-center justify-between gap-2 border-b border-gray-200 text-left text-h-18-regular text-gray-900 last:border-b-0 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-200"
        >
          <span className="min-w-0 truncate">{tag.label}</span>
          {index === 0 ? (
            <IconCheck className="size-5 shrink-0 text-green-400" />
          ) : null}
        </button>
      ))}
    </div>
  );
}

function PaySettingCard({
  payKind,
  onSelectPayKind,
}: {
  payKind: WorkerApplicationPayKind;
  onSelectPayKind: (payKind: WorkerApplicationPayKind) => void;
}) {
  const setting = workerApplicationPaySettings[payKind];

  return (
    <section className="rounded-[8px] border border-gray-100 px-4 py-4">
      <h3 className="text-h-18-semibold text-gray-900">
        급여 설정 <span className="text-red-500">*</span>
      </h3>
      <div className="mt-3 grid h-[56px] grid-cols-2 overflow-hidden rounded-[8px] border border-gray-200 bg-white p-1">
        <PayKindButton
          active={payKind === "hourly"}
          label="시급"
          testId="worker-application-pay-hourly"
          onClick={() => onSelectPayKind("hourly")}
        />
        <PayKindButton
          active={payKind === "monthly"}
          label="월급"
          testId="worker-application-pay-monthly"
          onClick={() => onSelectPayKind("monthly")}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <input
          readOnly
          value=""
          placeholder={setting.placeholder}
          className="h-[49px] min-w-0 flex-1 rounded-[8px] border border-gray-200 bg-gray-50 px-4 text-h-18-regular text-gray-900 outline-none placeholder:text-gray-400"
          aria-label="급여 입력"
        />
        <span className="w-[52px] shrink-0 text-right text-h-18-regular text-gray-900">
          {setting.unit}
        </span>
      </div>

      <div className="mt-4 flex min-h-[57px] items-center gap-3 border-t border-gray-100 pt-4">
        <span className="shrink-0 text-h-18-semibold text-gray-800">세율</span>
        <Badge
          variant="green"
          size="L"
          className="rounded-full bg-green-400 px-4"
          style={{ color: "var(--color-white)" }}
        >
          3.3%
        </Badge>
        <button
          type="button"
          className="h-[42px] rounded-full border border-gray-200 bg-white px-4 text-h-16-medium text-gray-700 transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
        >
          직접 입력 (%)
        </button>
      </div>
    </section>
  );
}

function PayKindButton({
  active,
  label,
  testId,
  onClick,
}: {
  active: boolean;
  label: string;
  testId: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      data-testid={testId}
      onClick={onClick}
      className={cn(
        "rounded-[7px] text-h-18-semibold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200",
        active ? "bg-green-400 text-white" : "bg-white text-gray-800",
      )}
    >
      {label}
    </button>
  );
}
