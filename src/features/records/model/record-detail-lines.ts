import type {
  RecordDetailLine,
  RecordDetailLineSection,
  RecordsTone,
} from "./records-fixtures";

export type RecordLineSectionValues = {
  checkIn: string;
  checkOut: string;
  locationName: string;
  logStatus: string;
  logTone?: RecordsTone;
  workEnd: string;
  workStart: string;
};

export type OvertimeLineSectionValues = {
  overtimeEnd: string;
  overtimeStart: string;
  reason: string;
};

export function createRecordDetailLine(
  id: string,
  label: string,
  value: string,
  tone?: RecordsTone,
): RecordDetailLine {
  return {
    id,
    label,
    tone,
    value,
  };
}

export function createRecordLineSections(
  values: RecordLineSectionValues,
): readonly RecordDetailLineSection[] {
  return [
    {
      id: "work-record",
      title: "근무기록",
      lines: [
        createRecordDetailLine("work-start", "근무 시작", values.workStart),
        createRecordDetailLine("work-end", "근무 종료", values.workEnd),
        createRecordDetailLine(
          "work-location",
          "근무지",
          values.locationName,
        ),
      ],
    },
    {
      id: "attendance-log",
      title: "출퇴근 기록",
      lines: [
        createRecordDetailLine("check-in", "출근 시각", values.checkIn),
        createRecordDetailLine("check-out", "퇴근 시각", values.checkOut),
        createRecordDetailLine(
          "log-status",
          "로그 판정",
          values.logStatus,
          values.logTone,
        ),
      ],
    },
  ];
}

export function createOvertimeLineSection(
  values: OvertimeLineSectionValues,
): RecordDetailLineSection {
  return {
    id: "overtime-work",
    title: "추가근무 신청",
    lines: [
      createRecordDetailLine(
        "overtime-start",
        "추가근무 시작",
        values.overtimeStart,
      ),
      createRecordDetailLine(
        "overtime-end",
        "추가근무 종료",
        values.overtimeEnd,
      ),
      createRecordDetailLine("reason", "신청 사유", values.reason),
    ],
  };
}
