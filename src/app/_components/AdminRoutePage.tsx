import { Tag } from "@/components/Tag";
import type {
  AdminScreen,
  AdminScreenMetric,
} from "@/app/_config/admin-navigation";

export function AdminRoutePage({ screen }: { screen: AdminScreen }) {
  return (
    <div className="space-y-7">
      <header className="flex items-start justify-between gap-6">
        <div>
          <div className="mb-2 text-label-12-medium text-gray-400">
            {screen.screenId}
          </div>
          <h2 className="text-h-24 text-gray-900">{screen.title}</h2>
          <p className="mt-2 max-w-[680px] text-body-16-regular text-gray-500">
            {screen.description}
          </p>
        </div>
      </header>

      <section className="flex flex-wrap gap-4" aria-label="요약 지표">
        {screen.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="overflow-hidden rounded-[10px] border border-gray-200 bg-white">
        <div className="flex h-[60px] items-center justify-between border-b border-gray-100 px-5">
          <h3 className="text-h-18-semibold text-gray-900">
            {screen.tableTitle}
          </h3>
          <Tag variant="outline" size="M" interactive>
            {screen.tableRows.length}건
          </Tag>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {screen.tableColumns.map((column) => (
                  <th
                    key={column}
                    className="px-5 py-3 text-label-14-medium text-gray-500"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {screen.tableRows.map((row) => (
                <tr
                  key={row.join("-")}
                  className="border-b border-gray-100 transition-colors duration-150 ease-out last:border-b-0 hover:bg-gray-50 active:bg-gray-100"
                >
                  {row.map((cell, index) => (
                    <td
                      key={`${cell}-${index}`}
                      className="px-5 py-4 text-body-14-regular text-gray-800"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ metric }: { metric: AdminScreenMetric }) {
  return (
    <div className="w-[250px] rounded-[10px] border border-gray-200 bg-white px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="truncate text-label-18 text-gray-800">
          {metric.label}
        </div>
        <Tag variant={metric.tone ?? "green"} size="M">
          {metric.tag}
        </Tag>
      </div>
      <div className="mt-1 flex items-baseline gap-1 text-green-400">
        <span className="text-[36px] font-semibold leading-[1.25]">
          {metric.value}
        </span>
        {metric.unit ? (
          <span className="text-h-20 text-green-400">{metric.unit}</span>
        ) : null}
      </div>
    </div>
  );
}
