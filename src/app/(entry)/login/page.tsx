import { EntryRoutePage } from "@/app/_components/EntryRoutePage";

export default function Page() {
  return (
    <EntryRoutePage
      title="로그인"
      description="Wee 관리자 워크스페이스에 접속합니다."
      fields={[
        { label: "이메일", type: "email", placeholder: "admin@wee.kr" },
        { label: "비밀번호", type: "password", placeholder: "비밀번호" },
      ]}
      actionLabel="로그인"
      actionHref="/dashboard"
    />
  );
}
