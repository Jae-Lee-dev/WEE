import {
  RecordAnomalyHistoryScreen,
  RecordAttendanceScreen,
  RecordCorrectionsScreen,
  RecordMainScreen,
  RecordOvertimeHistoryScreen,
} from "@/features/records";

export type RecordsPageSearchParams = {
  focus?: string;
  recordId?: string;
  workerName?: string;
};

export function RecordMainPage({
  searchParams,
}: {
  searchParams: RecordsPageSearchParams;
}) {
  return (
    <RecordMainScreen
      initialFocusId={searchParams.focus ?? searchParams.recordId}
      initialWorkerNameFilter={searchParams.workerName}
    />
  );
}

export function RecordAttendancePage() {
  return <RecordAttendanceScreen />;
}

export function RecordCorrectionsPage() {
  return <RecordCorrectionsScreen />;
}

export function RecordOvertimeHistoryPage() {
  return <RecordOvertimeHistoryScreen />;
}

export function RecordAnomalyHistoryPage() {
  return <RecordAnomalyHistoryScreen />;
}
