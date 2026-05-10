import { EntryRoutePage } from "@/app/_components/EntryRoutePage";

export default function Page() {
  return (
    <EntryRoutePage
      title="운영 기준 설정"
      description="근무 승인과 급여 산정에 필요한 초기 기준을 입력합니다."
      fields={[
        { label: "기본 시급", inputMode: "numeric", placeholder: "12000" },
        { label: "기본 근무 반경", inputMode: "numeric", placeholder: "100m" },
      ]}
      actionLabel="대시보드로 이동"
      actionHref="/dashboard"
    />
  );
}
