"use client";

import {
  type ChangeEvent,
  type ComponentProps,
  type FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { getFirebaseAuth } from "@/lib/firebase/client";

type SignupFormState = {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
};

const initialSignupForm: SignupFormState = {
  name: "",
  email: "",
  password: "",
  passwordConfirm: "",
};

const passwordRequirementLabels = ["최소 8자", "영문·숫자 조합", "특수문자 선택"];

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState<SignupFormState>(initialSignupForm);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [notificationsAccepted, setNotificationsAccepted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFieldChange =
    (field: keyof SignupFormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const name = form.name.trim();
    const email = form.email.trim();

    if (!name || !email || !form.password || !form.passwordConfirm) {
      setErrorMessage("이름, 이메일, 비밀번호를 모두 입력해 주세요.");
      return;
    }

    if (form.password.length < 8) {
      setErrorMessage("비밀번호는 최소 8자 이상이어야 합니다.");
      return;
    }

    if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      setErrorMessage("비밀번호는 영문과 숫자를 모두 포함해야 합니다.");
      return;
    }

    if (form.password !== form.passwordConfirm) {
      setErrorMessage("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    if (!termsAccepted) {
      setErrorMessage("서비스 이용약관과 개인정보 처리방침에 동의해 주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const auth = getFirebaseAuth();
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        form.password,
      );

      await updateProfile(credential.user, { displayName: name });
      await sendEmailVerification(credential.user);

      router.push("/onboarding/workspace");
    } catch (error) {
      setErrorMessage(getSignupErrorMessage(error));
      setIsSubmitting(false);
    }
  }

  return (
    <form className="w-full" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <SignupTextField
          label="이름"
          autoComplete="name"
          value={form.name}
          onChange={handleFieldChange("name")}
          placeholder="김민채"
          required
          disabled={isSubmitting}
        />
        <SignupTextField
          label="이메일"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={handleFieldChange("email")}
          placeholder="admin@wee.kr"
          required
          disabled={isSubmitting}
        />
        <SignupTextField
          label="비밀번호"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={handleFieldChange("password")}
          placeholder="8자 이상"
          required
          disabled={isSubmitting}
        />
        <SignupTextField
          label="비밀번호 확인"
          type="password"
          autoComplete="new-password"
          value={form.passwordConfirm}
          onChange={handleFieldChange("passwordConfirm")}
          placeholder="비밀번호 재입력"
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="mt-5 rounded-[8px] border border-green-100 bg-green-50 px-4 py-3">
        <div className="text-label-14-medium tracking-normal text-gray-800">
          비밀번호 조건
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {passwordRequirementLabels.map((item) => (
            <span
              key={item}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-label-12-medium tracking-normal text-gray-600"
            >
              <Check className="size-3.5 text-green-400" strokeWidth={2.4} />
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <SignupCheckbox
          id="signup-terms"
          checked={termsAccepted}
          disabled={isSubmitting}
          label="서비스 이용약관과 개인정보 처리방침에 동의합니다."
          onCheckedChange={setTermsAccepted}
        />
        <SignupCheckbox
          id="signup-notifications"
          checked={notificationsAccepted}
          disabled={isSubmitting}
          label="운영 알림 수신에 동의합니다."
          onCheckedChange={setNotificationsAccepted}
        />
      </div>

      {errorMessage ? (
        <p
          className="mt-5 rounded-[8px] border border-red-100 bg-red-50 px-4 py-3 text-body-14-medium tracking-normal text-red-500"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <Button
        className="mt-7 h-[50px] w-full rounded-[8px] text-h-18-semibold tracking-normal"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "가입 처리 중" : "인증 메일 보내기"}
      </Button>
    </form>
  );
}

function SignupTextField({
  label,
  ...props
}: ComponentProps<typeof Input> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-label-14-medium tracking-normal text-gray-700">
        {label}
      </span>
      <Input
        className="h-12 rounded-[8px] border-gray-200 text-body-16-regular tracking-normal"
        {...props}
      />
    </label>
  );
}

function SignupCheckbox({
  id,
  checked,
  disabled,
  label,
  onCheckedChange,
}: {
  id: string;
  checked: boolean;
  disabled: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-6 items-start gap-2 text-body-14-regular tracking-normal text-gray-600">
      <Checkbox
        id={id}
        aria-label={label}
        checked={checked}
        disabled={disabled}
        className="mt-0.5 size-4 rounded-[4px]"
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <label htmlFor={id} className="cursor-pointer select-none">
        {label}
      </label>
    </div>
  );
}

function getSignupErrorMessage(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return "회원가입 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  }

  switch (error.code) {
    case "auth/email-already-in-use":
      return "이미 가입된 이메일입니다. 로그인 또는 비밀번호 찾기를 이용해 주세요.";
    case "auth/invalid-email":
      return "이메일 형식이 올바르지 않습니다.";
    case "auth/operation-not-allowed":
      return "Firebase Auth에서 이메일/비밀번호 로그인이 아직 활성화되지 않았습니다.";
    case "auth/weak-password":
      return "비밀번호는 최소 6자 이상이어야 합니다. Wee에서는 8자 이상을 권장합니다.";
    default:
      return "회원가입 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  }
}
