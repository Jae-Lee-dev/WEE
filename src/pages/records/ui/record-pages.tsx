import {
  RecordAnomalyHistoryScreen,
  RecordAttendanceScreen,
  RecordCorrectionsScreen,
  RecordMainScreen,
} from "@/features/records";

export type RecordsPageSearchParams = {
  focus?: string;
  recordId?: string;
};

export function RecordMainPage({
  searchParams,
}: {
  searchParams: RecordsPageSearchParams;
}) {
  return (
    <RecordMainScreen
      initialFocusId={searchParams.focus ?? searchParams.recordId}
    />
  );
}

export function RecordAttendancePage() {
  return <RecordAttendanceScreen />;
}

export function RecordCorrectionsPage() {
  return <RecordCorrectionsScreen />;
}

export function RecordAnomalyHistoryPage() {
  return <RecordAnomalyHistoryScreen />;
}
