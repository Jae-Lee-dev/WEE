import { EntryRoutePage } from "@/app/_components/EntryRoutePage";

export default function Page() {
  return (
    <EntryRoutePage
      title="회원가입"
      description="관리자 계정을 만들고 워크스페이스 설정으로 이동합니다."
      fields={[
        { label: "이름", placeholder: "김민채" },
        { label: "이메일", type: "email", placeholder: "admin@wee.kr" },
        { label: "비밀번호", type: "password", placeholder: "비밀번호" },
      ]}
      actionLabel="계정 만들기"
      actionHref="/onboarding/workspace"
    />
  );
}
