"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  WorkerDetailSubsection,
  WorkerDetailSubsectionHeader,
  useWorkerDetailProfileSync,
} from "./worker-detail-shell";
import { defaultWorkerDetailRouteId } from "../model/worker-detail-common-fixtures";
import {
  workerDetailScheduleDays,
  workerDetailScheduleHours,
  type WorkerDetailScheduleBlock,
  type WorkerDetailScheduleHistory,
  type WorkerDetailScheduleTone,
  type WorkerDetailWorkRecord,
} from "../model/worker-detail-schedule-fixtures";
import {
  createWorkerDetailScheduleDataSource,
  type WorkerDetailScheduleViewModel,
} from "../api/worker-detail-schedule-data-source";

const hourColumnCount = workerDetailScheduleHours.length;
const firstHour = Number(workerDetailScheduleHours[0]);

const scheduleBlockToneClassNames: Record<WorkerDetailScheduleTone, string> = {
  green: "border-green-400 bg-green-100 text-gray-800",
  orange: "border-orange-400 bg-orange-100 text-gray-800",
  blue: "border-blue-500 bg-blue-50 text-gray-800",
};

const flagBadgeTone = {
  green: {
    variant: "green",
    style: { color: "var(--color-green-400)" },
  },
  orange: {
    variant: "orange",
    style: { color: "var(--color-orange-400)" },
  },
  red: {
    variant: "red",
    style: { color: "var(--color-red-500)" },
  },
} as const;

export function WorkerDetailScheduleScreen({
  workerId = defaultWorkerDetailRouteId,
}: {
  workerId?: string;
}) {
  const dataSource = useMemo(() => createWorkerDetailScheduleDataSource(), []);
  const [viewModel, setViewModel] = useState<WorkerDetailScheduleViewModel>(
    dataSource.initialData ?? {
      blocks: [],
      history: [],
      profile: {
        deleteLabel: "조교 삭제",
        monthlySummary: "당월 급여명세 확인 중",
        name: "조교 정보 로딩 중",
        paySummary: "급여 설정 확인 중",
        registeredSummary: "등록일 확인 중",
        status: "활성",
        tag: "태그 확인 중",
      },
      recentRecords: [],
    },
  );
  const [loading, setLoading] = useState(!dataSource.initialData);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (dataSource.initialData) {
      return;
    }

    let active = true;

    void dataSource
      .getSchedule(workerId)
      .then((nextViewModel) => {
        if (!active) {
          return;
        }

        setViewModel(nextViewModel);
        setLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setErrorMessage("조교 시간표를 불러오지 못했습니다.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dataSource, workerId]);

  useWorkerDetailProfileSync(viewModel.profile);

  return (
    <>
      {errorMessage ? (
        <div
          className="rounded-[8px] border border-red-100 bg-red-50 px-4 py-2.5 text-body-14-medium tracking-normal text-red-500"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : null}
      <div
        className="grid grid-cols-[minmax(0,1fr)_360px] gap-4"
        data-testid="worker-detail-schedule-screen"
      >
        <ScheduleGrid blocks={viewModel.blocks} />
        <ScheduleHistoryPanel history={viewModel.history} loading={loading} />
      </div>
      <RecentWorkRecords
        loading={loading}
        profileName={viewModel.profile.name}
        records={viewModel.recentRecords}
        workerId={workerId}
      />
    </>
  );
}

function ScheduleGrid({
  blocks: scheduleBlocks,
}: {
  blocks: readonly WorkerDetailScheduleBlock[];
}) {
  return (
    <section
      aria-label="주간 시간표"
      className="min-w-0 overflow-hidden rounded-[10px] border border-gray-200 bg-white"
    >
      <div
        className="grid h-[47px] grid-cols-[48px_minmax(0,1fr)] border-b border-gray-200"
        role="row"
      >
        <div className="border-r border-gray-200" />
        <div className="grid grid-cols-[repeat(17,minmax(0,1fr))]">
          {workerDetailScheduleHours.map((hour, index) => (
            <div
              className={cn(
                "flex items-center justify-center border-r border-gray-200 px-1 text-detail-16-regular text-gray-500",
                index === workerDetailScheduleHours.length - 1 &&
                  "border-r-0",
              )}
              key={hour}
              role="columnheader"
            >
              {hour}
            </div>
          ))}
        </div>
      </div>

      {workerDetailScheduleDays.map((day, index) => {
        const blocks = scheduleBlocks.filter(
          (block) => block.dayId === day.id,
        );
        const last = index === workerDetailScheduleDays.length - 1;

        return (
          <div
            className={cn(
              "grid h-[110px] grid-cols-[48px_minmax(0,1fr)]",
              !last && "border-b border-gray-100",
            )}
            key={day.id}
            role="row"
          >
            <div
              className={cn(
                "flex items-center justify-center border-r border-gray-200 bg-gray-50 px-1 text-h-18-semibold",
                getScheduleDayTextClassName(day.id),
                last && "rounded-bl-[8px]",
              )}
              role="rowheader"
            >
              {day.label}
            </div>
            <div className="relative min-w-0 bg-white">
              <div
                aria-hidden="true"
                className="absolute inset-0 grid grid-cols-[repeat(17,minmax(0,1fr))]"
              >
                {workerDetailScheduleHours.map((hour, hourIndex) => (
                  <div
                    className={cn(
                      "border-r border-gray-100",
                      hourIndex === workerDetailScheduleHours.length - 1 &&
                        "border-r-0",
                    )}
                    key={`${day.id}-${hour}`}
                  />
                ))}
              </div>

              {blocks.map((block) => (
                <ScheduleBlock block={block} key={block.id} />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function ScheduleBlock({ block }: { block: WorkerDetailScheduleBlock }) {
  return (
    <div
      aria-label={`${block.title} ${block.startHour}:00~${block.endHour}:00`}
      className={cn(
        "absolute top-0 z-10 flex h-[46px] items-center overflow-hidden rounded-[4px] border px-1.5 py-1 text-h-14-semibold",
        scheduleBlockToneClassNames[block.tone],
      )}
      role="gridcell"
      style={getScheduleBlockStyle(block)}
    >
      <span className="truncate">{block.title}</span>
    </div>
  );
}

function ScheduleHistoryPanel({
  history,
  loading,
}: {
  history: readonly WorkerDetailScheduleHistory[];
  loading: boolean;
}) {
  return (
    <WorkerDetailSubsection
      ariaLabel="시간표 변경 이력"
      className="min-h-[500px]"
    >
      <WorkerDetailSubsectionHeader>
        <h2 className="text-h-20 text-gray-900">시간표 변경 이력</h2>
      </WorkerDetailSubsectionHeader>
      <div className="flex flex-col gap-3">
        {loading ? (
          <PanelState>시간표 이력을 불러오는 중입니다.</PanelState>
        ) : history.length > 0 ? (
          history.map((item) => (
            <ScheduleHistoryCard item={item} key={item.id} />
          ))
        ) : (
          <PanelState>표시할 시간표 이력이 없습니다.</PanelState>
        )}
      </div>
    </WorkerDetailSubsection>
  );
}

function ScheduleHistoryCard({
  item,
}: {
  item: WorkerDetailScheduleHistory;
}) {
  const active = item.status === "활성";
  const pending = item.status === "대기";

  return (
    <article
      className={cn(
        "rounded-[8px] border p-3.5",
        active ? "border-green-400 bg-white" : "border-gray-100 bg-white",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Badge
          variant={active ? "green" : pending ? "orange" : "red"}
          size="M"
          style={{
            color: active
              ? "var(--color-green-400)"
              : pending
                ? "var(--color-orange-400)"
                : "var(--color-red-500)",
          }}
        >
          {item.status}
        </Badge>
        <h3 className="min-w-0 truncate text-h-20 text-gray-900">
          {item.title}
        </h3>
      </div>
      <dl className="mt-3 grid grid-cols-[48px_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-h-18-regular">
        <dt className="text-gray-800">근무일</dt>
        <dd className="min-w-0 truncate text-gray-900">{item.workDays}</dd>
        <dt className="text-gray-800">메모</dt>
        <dd className="min-w-0 truncate text-gray-900">{item.memo}</dd>
      </dl>
      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          variant="secondary"
          className="h-9 rounded-full px-4 text-h-18-regular text-gray-800"
        >
          {item.actionLabel}
        </Button>
      </div>
    </article>
  );
}

function RecentWorkRecords({
  loading,
  profileName,
  records,
  workerId,
}: {
  loading: boolean;
  profileName: string;
  records: readonly WorkerDetailWorkRecord[];
  workerId: string;
}) {
  const normalizedProfileName = profileName.trim();
  const canLinkWithProfileName =
    !loading &&
    normalizedProfileName &&
    normalizedProfileName !== "조교 정보 로딩 중";
  const recordsHref = `/records?workerName=${encodeURIComponent(
    normalizedProfileName,
  )}`;

  return (
    <WorkerDetailSubsection
      ariaLabel="최근 근무 기록"
      className="overflow-hidden"
      testId="worker-detail-recent-work-records"
    >
      <WorkerDetailSubsectionHeader
        actions={
          canLinkWithProfileName ? (
            <Button
              asChild
              variant="secondary"
              className="h-9 rounded-full px-4 text-h-18-regular text-gray-800"
            >
              <Link href={recordsHref} data-worker-id={workerId}>
                근무기록으로 이동
              </Link>
            </Button>
          ) : null
        }
      >
        <h2 className="text-h-20 text-gray-900">최근 근무 기록</h2>
      </WorkerDetailSubsectionHeader>
      <div
        className="grid h-10 grid-cols-[23%_26%_26%_1fr] items-center border-b border-gray-300 text-h-18-regular text-gray-500"
        role="row"
      >
        <div role="columnheader">날짜</div>
        <div role="columnheader">근무</div>
        <div role="columnheader">시간</div>
        <div role="columnheader">플래그</div>
      </div>
      <div role="rowgroup">
        {loading ? (
          <PanelState>최근 근무 기록을 불러오는 중입니다.</PanelState>
        ) : records.length > 0 ? (
          records.map((record) => (
            <RecentWorkRecordRow key={record.id} record={record} />
          ))
        ) : (
          <PanelState>표시할 근무 기록이 없습니다.</PanelState>
        )}
      </div>
    </WorkerDetailSubsection>
  );
}

function getScheduleDayTextClassName(dayId: string) {
  switch (dayId) {
    case "sun":
      return "text-red-500";
    case "sat":
      return "text-blue-500";
    default:
      return "text-gray-800";
  }
}

function PanelState({ children }: { children: string }) {
  return (
    <div className="flex min-h-20 items-center justify-center text-center text-h-18-regular text-gray-500">
      {children}
    </div>
  );
}

function RecentWorkRecordRow({
  record,
}: {
  record: WorkerDetailWorkRecord;
}) {
  const tone = flagBadgeTone[record.tone];

  return (
    <div
      className="grid h-10 grid-cols-[23%_26%_26%_1fr] items-center border-b border-gray-100 text-h-18-regular text-gray-900 last:border-b-0"
      role="row"
    >
      <div role="cell">{record.date}</div>
      <div role="cell">{record.duty}</div>
      <div role="cell">{record.time}</div>
      <div role="cell">
        <Badge variant={tone.variant} size="M" style={tone.style}>
          {record.flag}
        </Badge>
      </div>
    </div>
  );
}

function getScheduleBlockStyle(block: WorkerDetailScheduleBlock): CSSProperties {
  const start = normalizeHour(block.startHour);
  const end = normalizeHour(block.endHour);
  const startColumn = clamp(start - firstHour, 0, hourColumnCount - 1);
  const endColumn = clamp(end - firstHour, startColumn + 1, hourColumnCount);

  return {
    left: `${(startColumn / hourColumnCount) * 100}%`,
    width: `${((endColumn - startColumn) / hourColumnCount) * 100}%`,
  };
}

function normalizeHour(hour: number) {
  return hour < firstHour ? hour + 24 : hour;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
