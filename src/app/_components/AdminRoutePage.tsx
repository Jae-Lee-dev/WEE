import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/app/_components/data-table";
import {
  MetricStrip,
  PageFrame,
  PageFrameHeader,
  SectionTitle,
} from "@/app/_components/page-frame";
import {
  findRouteMetaByHref,
  type AdminScreen,
} from "@/app/_config/admin-navigation";

type PlaceholderRow = {
  id: string;
  cells: string[];
};

export function AdminRoutePage({ screen }: { screen: AdminScreen }) {
  const routeMeta = findRouteMetaByHref(screen.href);
  const rows = screen.tableRows.map((cells, index) => ({
    id: `${screen.screenId}-${index}`,
    cells,
  }));
  const columns: DataTableColumn<PlaceholderRow>[] = screen.tableColumns.map(
    (column, index) => ({
      id: `${screen.screenId}-${column}`,
      header: column,
      cell: (row) => row.cells[index],
    }),
  );

  return (
    <PageFrame>
      <PageFrameHeader
        eyebrow={screen.screenId}
        title={screen.title}
        description={screen.description}
      />

      <PlaceholderNotice figmaBacked={routeMeta?.figmaBacked ?? false} />

      <MetricStrip metrics={screen.metrics} className="xl:grid-cols-3" />

      <SectionTitle
        title={screen.tableTitle}
        count={`${screen.tableRows.length}건`}
      />
      <DataTable columns={columns} rows={rows} />
    </PageFrame>
  );
}

function PlaceholderNotice({ figmaBacked }: { figmaBacked: boolean }) {
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-4 rounded-[8px] border border-gray-200 bg-gray-50 px-4 py-3">
      <p className="text-body-14-regular text-gray-600">
        {figmaBacked
          ? "Figma-backed 화면입니다. 도메인 branch에서 등록된 frame 기준으로 교체됩니다."
          : "Figma frame 미확정 deferred placeholder입니다. 사용자 승인 전 구현하지 않습니다."}
      </p>
      <Badge variant={figmaBacked ? "green" : "grey"} size="M">
        {figmaBacked ? "queued" : "deferred"}
      </Badge>
    </div>
  );
}
