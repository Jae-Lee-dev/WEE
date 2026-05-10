import { EntryRoutePage } from "@/app/_components/EntryRoutePage";

export default function Page() {
  return (
    <EntryRoutePage
      title="워크스페이스 생성"
      description="학원 운영 단위를 만들고 기본 사업장 정보를 입력합니다."
      fields={[
        { label: "워크스페이스명", placeholder: "Wee 학원" },
        { label: "대표 연락처", type: "tel", placeholder: "02-0000-0000" },
      ]}
      actionLabel="운영 기준 설정"
      actionHref="/onboarding/setup"
    />
  );
}
