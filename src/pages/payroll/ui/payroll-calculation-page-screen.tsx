"use client";

import { useMemo } from "react";
import {
  PayrollCalculationScreen,
  type PayrollRecordActionAdapter,
} from "@/features/payroll";
import { createRecordsDataSource } from "@/features/records";
import { getRecordActionSavedMessage } from "@/shared/ui/record-action-detail-panel";

type PayrollCalculationPageScreenProps = {
  initialFocusId?: string;
  initialMonthKey?: string;
  initialWorkerId?: string;
};

export function PayrollCalculationPageScreen({
  initialFocusId,
  initialMonthKey,
  initialWorkerId,
}: PayrollCalculationPageScreenProps) {
  const recordsDataSource = useMemo(() => createRecordsDataSource(), []);
  const recordActionAdapter = useMemo<PayrollRecordActionAdapter>(
    () => ({
      async apply(recordId, input) {
        await recordsDataSource.applyMainRecordAction({
          ...input,
          recordId,
        });

        return { message: getRecordActionSavedMessage(input.action) };
      },
      load: () => recordsDataSource.getMainRecords(),
    }),
    [recordsDataSource],
  );

  return (
    <PayrollCalculationScreen
      initialFocusId={initialFocusId}
      initialMonthKey={initialMonthKey}
      initialWorkerId={initialWorkerId}
      recordActionAdapter={recordActionAdapter}
    />
  );
}
