"use client";

import {
  type ChangeEvent,
  type ComponentProps,
  type FormEvent,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";

type LoginFormState = {
  email: string;
  password: string;
};

type LoginField = keyof LoginFormState;
type LoginFormErrors = Partial<Record<LoginField, string>>;
type TouchedFields = Partial<Record<LoginField, boolean>>;

const initialLoginForm: LoginFormState = {
  email: "",
  password: "",
};

export function LoginForm() {
  const router = useRouter();
  const [form, setForm] = useState<LoginFormState>(initialLoginForm);
  const [rememberLogin, setRememberLogin] = useState(true);
  const [touchedFields, setTouchedFields] = useState<TouchedFields>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [firebaseErrorMessage, setFirebaseErrorMessage] = useState<
    string | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validationErrors = getLoginFormErrors(form);
  const hasValidationErrors = hasLoginFormErrors(validationErrors);
  const alertMessage =
    firebaseErrorMessage ??
    (hasSubmitted && hasValidationErrors
      ? "이메일과 비밀번호를 입력해 주세요."
      : null);

  const handleFieldChange =
    (field: LoginField) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
      setFirebaseErrorMessage(null);
    };

  const handleFieldBlur = (field: LoginField) => () => {
    setTouchedFields((current) => ({ ...current, [field]: true }));
  };

  const getVisibleFieldError = (field: LoginField) => {
    if (!hasSubmitted && !touchedFields[field]) {
      return undefined;
    }

    return validationErrors[field];
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSubmitted(true);
    setFirebaseErrorMessage(null);

    if (hasValidationErrors) {
      return;
    }

    setIsSubmitting(true);

    try {
      const auth = getFirebaseAuth();
      await setPersistence(
        auth,
        rememberLogin ? browserLocalPersistence : browserSessionPersistence,
      );
      await signInWithEmailAndPassword(
        auth,
        form.email.trim().toLowerCase(),
        form.password,
      );

      router.replace("/dashboard");
    } catch (error) {
      setFirebaseErrorMessage(getLoginErrorMessage(error));
      setIsSubmitting(false);
    }
  }

  return (
    <form className="w-full" onSubmit={handleSubmit} noValidate>
      <div className="space-y-3.5">
        <LoginTextField
          id="login-email"
          label="이메일"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          value={form.email}
          onChange={handleFieldChange("email")}
          onBlur={handleFieldBlur("email")}
          placeholder="admin@wee.kr"
          error={getVisibleFieldError("email")}
          required
          autoFocus
          disabled={isSubmitting}
        />
        <LoginTextField
          id="login-password"
          label="비밀번호"
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={handleFieldChange("password")}
          onBlur={handleFieldBlur("password")}
          placeholder="비밀번호"
          error={getVisibleFieldError("password")}
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-h-6 items-start gap-2 text-body-14-regular tracking-normal text-gray-600">
          <Checkbox
            id="login-remember"
            aria-label="로그인 유지"
            checked={rememberLogin}
            disabled={isSubmitting}
            className="mt-0.5 size-4 rounded-[4px]"
            onCheckedChange={(value) => setRememberLogin(value === true)}
          />
          <label
            htmlFor="login-remember"
            className="cursor-pointer select-none"
          >
            로그인 유지
          </label>
        </div>
        <Link
          href="/forgot-password"
          className="text-label-14-medium tracking-normal text-green-400 transition-colors hover:text-green-500"
        >
          아이디/비밀번호 찾기
        </Link>
      </div>

      {alertMessage ? (
        <p
          className="mt-5 rounded-[8px] border border-red-100 bg-red-50 px-4 py-3 text-body-14-medium tracking-normal text-red-500"
          data-testid="login-alert"
          role="alert"
        >
          {alertMessage}
        </p>
      ) : null}

      <Button
        className="mt-6 h-[50px] w-full rounded-[8px] text-h-18-semibold tracking-normal"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "로그인 중" : "로그인"}
      </Button>
    </form>
  );
}

function LoginTextField({
  id,
  label,
  error,
  className,
  ...props
}: ComponentProps<typeof Input> & {
  id: string;
  label: string;
  error?: string;
}) {
  const errorId = `${id}-error`;

  return (
    <div className={cn("block", className)}>
      <label
        className="mb-2 block text-label-14-medium tracking-normal text-gray-700"
        htmlFor={id}
      >
        {label}
      </label>
      <Input
        id={id}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        className="h-12 rounded-[8px] border-gray-200 text-body-16-regular tracking-normal"
        {...props}
      />
      {error ? (
        <p
          className="mt-2 text-label-12-medium tracking-normal text-red-500"
          id={errorId}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function getLoginFormErrors(form: LoginFormState) {
  const errors: LoginFormErrors = {};
  const email = form.email.trim();

  if (!email) {
    errors.email = "이메일을 입력해 주세요.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "이메일 형식을 확인해 주세요.";
  }

  if (!form.password) {
    errors.password = "비밀번호를 입력해 주세요.";
  }

  return errors;
}

function hasLoginFormErrors(errors: LoginFormErrors) {
  return Object.values(errors).some(Boolean);
}

function getLoginErrorMessage(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return "로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  }

  switch (error.code) {
    case "auth/invalid-email":
      return "이메일 형식을 확인해 주세요.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "이메일 또는 비밀번호가 일치하지 않습니다.";
    case "auth/too-many-requests":
      return "로그인 시도가 많습니다. 잠시 후 다시 시도해 주세요.";
    case "auth/operation-not-allowed":
      return "Firebase Auth에서 이메일/비밀번호 로그인이 아직 활성화되지 않았습니다.";
    case "auth/network-request-failed":
      return "네트워크 연결을 확인한 뒤 다시 시도해 주세요.";
    default:
      return "로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  }
}
