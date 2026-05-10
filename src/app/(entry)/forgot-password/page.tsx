import { EntryRoutePage } from "@/app/_components/EntryRoutePage";

export default function Page() {
  return (
    <EntryRoutePage
      title="비밀번호 재설정"
      description="관리자 이메일로 재설정 링크를 보냅니다."
      fields={[{ label: "이메일", type: "email", placeholder: "admin@wee.kr" }]}
      actionLabel="재설정 링크 보내기"
      actionHref="/login"
    />
  );
}
