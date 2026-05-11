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
import { Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";

type SignupFormState = {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
};

type SignupField = keyof SignupFormState;
type SignupFormErrors = Partial<Record<SignupField | "terms", string>>;
type TouchedFields = Partial<Record<SignupField, boolean>>;

const initialSignupForm: SignupFormState = {
  name: "",
  email: "",
  password: "",
  passwordConfirm: "",
};

const passwordRequirements = [
  {
    id: "length",
    label: "8자 이상",
    isMet: (password: string) => password.length >= 8,
  },
  {
    id: "letter",
    label: "영문 포함",
    isMet: (password: string) => /[A-Za-z]/.test(password),
  },
  {
    id: "number",
    label: "숫자 포함",
    isMet: (password: string) => /\d/.test(password),
  },
] as const;

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState<SignupFormState>(initialSignupForm);
  const [touchedFields, setTouchedFields] = useState<TouchedFields>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [notificationsAccepted, setNotificationsAccepted] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [firebaseErrorMessage, setFirebaseErrorMessage] = useState<
    string | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isPasswordConfirmVisible, setIsPasswordConfirmVisible] =
    useState(false);

  const validationErrors = getSignupFormErrors(form, termsAccepted);
  const hasValidationErrors = hasSignupFormErrors(validationErrors);
  const alertMessage =
    firebaseErrorMessage ??
    (hasSubmitted && hasValidationErrors
      ? "입력 내용을 다시 확인해 주세요."
      : null);

  const handleFieldChange =
    (field: SignupField) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
      setFirebaseErrorMessage(null);
    };

  const handleFieldBlur = (field: SignupField) => () => {
    setTouchedFields((current) => ({ ...current, [field]: true }));
  };

  const getVisibleFieldError = (field: SignupField) => {
    if (!hasSubmitted && !touchedFields[field]) {
      return undefined;
    }

    return validationErrors[field];
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSubmitted(true);
    setFirebaseErrorMessage(null);

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    if (hasValidationErrors) {
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
      setFirebaseErrorMessage(getSignupErrorMessage(error));
      setIsSubmitting(false);
    }
  }

  return (
    <form className="w-full" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <SignupTextField
          id="signup-name"
          label="이름"
          autoComplete="name"
          value={form.name}
          onChange={handleFieldChange("name")}
          onBlur={handleFieldBlur("name")}
          placeholder="김민채"
          error={getVisibleFieldError("name")}
          required
          autoFocus
          disabled={isSubmitting}
        />
        <SignupTextField
          id="signup-email"
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
          disabled={isSubmitting}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <SignupPasswordField
          id="signup-password"
          label="비밀번호"
          isVisible={isPasswordVisible}
          onToggleVisibility={() =>
            setIsPasswordVisible((current) => !current)
          }
          autoComplete="new-password"
          spellCheck={false}
          value={form.password}
          onChange={handleFieldChange("password")}
          onBlur={handleFieldBlur("password")}
          placeholder="8자 이상"
          error={getVisibleFieldError("password")}
          required
          disabled={isSubmitting}
        />
        <SignupPasswordField
          id="signup-password-confirm"
          label="비밀번호 확인"
          isVisible={isPasswordConfirmVisible}
          onToggleVisibility={() =>
            setIsPasswordConfirmVisible((current) => !current)
          }
          autoComplete="new-password"
          spellCheck={false}
          value={form.passwordConfirm}
          onChange={handleFieldChange("passwordConfirm")}
          onBlur={handleFieldBlur("passwordConfirm")}
          placeholder="비밀번호 재입력"
          error={getVisibleFieldError("passwordConfirm")}
          required
          disabled={isSubmitting}
        />
      </div>

      <PasswordRequirementList password={form.password} />

      <div className="mt-5 space-y-3">
        <SignupCheckbox
          id="signup-terms"
          checked={termsAccepted}
          disabled={isSubmitting}
          label="서비스 이용약관과 개인정보 처리방침에 동의합니다."
          requirementLabel="필수"
          error={hasSubmitted ? validationErrors.terms : undefined}
          onCheckedChange={(checked) => {
            setTermsAccepted(checked);
            setFirebaseErrorMessage(null);
          }}
        />
        <SignupCheckbox
          id="signup-notifications"
          checked={notificationsAccepted}
          disabled={isSubmitting}
          label="운영 알림 수신에 동의합니다."
          requirementLabel="선택"
          onCheckedChange={(checked) => {
            setNotificationsAccepted(checked);
            setFirebaseErrorMessage(null);
          }}
        />
      </div>

      {alertMessage ? (
        <p
          className="mt-5 rounded-[8px] border border-red-100 bg-red-50 px-4 py-3 text-body-14-medium tracking-normal text-red-500"
          data-testid="signup-alert"
          role="alert"
        >
          {alertMessage}
        </p>
      ) : null}

      <Button
        className="mt-7 h-[50px] w-full rounded-[8px] text-h-18-semibold tracking-normal"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "가입 처리 중" : "회원가입하고 인증 메일 받기"}
      </Button>
    </form>
  );
}

function SignupTextField({
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

function SignupPasswordField({
  id,
  label,
  isVisible,
  onToggleVisibility,
  error,
  className,
  ...props
}: ComponentProps<typeof Input> & {
  id: string;
  label: string;
  isVisible: boolean;
  onToggleVisibility: () => void;
  error?: string;
}) {
  const errorId = `${id}-error`;
  const visibilityLabel = isVisible ? `${label} 숨기기` : `${label} 보기`;
  const VisibilityIcon = isVisible ? EyeOff : Eye;

  return (
    <div className={cn("block", className)}>
      <label
        className="mb-2 block text-label-14-medium tracking-normal text-gray-700"
        htmlFor={id}
      >
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          className="h-12 rounded-[8px] border-gray-200 pr-12 text-body-16-regular tracking-normal"
          type={isVisible ? "text" : "password"}
          {...props}
        />
        <button
          type="button"
          aria-label={visibilityLabel}
          title={visibilityLabel}
          className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-[8px] text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 disabled:pointer-events-none disabled:opacity-50"
          disabled={props.disabled}
          onClick={onToggleVisibility}
        >
          <VisibilityIcon className="size-4.5" strokeWidth={2.2} />
        </button>
      </div>
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

function PasswordRequirementList({ password }: { password: string }) {
  return (
    <div className="mt-4" aria-label="비밀번호 조건">
      <div className="text-label-12-medium tracking-normal text-gray-500">
        비밀번호 조건
      </div>
      <ul className="mt-2 grid gap-2 sm:grid-cols-3">
        {passwordRequirements.map((requirement) => {
          const isMet = requirement.isMet(password);

          return (
            <li
              key={requirement.id}
              className={cn(
                "flex min-h-7 items-center gap-2 text-label-12-medium tracking-normal",
                isMet ? "text-green-500" : "text-gray-500",
              )}
              data-state={isMet ? "met" : "unmet"}
              data-testid={`password-requirement-${requirement.id}`}
            >
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full border",
                  isMet
                    ? "border-green-400 bg-green-400 text-white"
                    : "border-gray-200 bg-white text-gray-300",
                )}
              >
                {isMet ? (
                  <Check className="size-3.5" strokeWidth={2.8} />
                ) : (
                  <span className="size-1.5 rounded-full bg-current" />
                )}
              </span>
              {requirement.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SignupCheckbox({
  id,
  checked,
  disabled,
  error,
  label,
  onCheckedChange,
  requirementLabel,
}: {
  id: string;
  checked: boolean;
  disabled: boolean;
  error?: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
  requirementLabel: "필수" | "선택";
}) {
  const errorId = `${id}-error`;

  return (
    <div>
      <div className="flex min-h-6 items-start gap-2 text-body-14-regular tracking-normal text-gray-600">
        <Checkbox
          id={id}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          aria-label={label}
          checked={checked}
          disabled={disabled}
          className="mt-0.5 size-4 rounded-[4px]"
          onCheckedChange={(value) => onCheckedChange(value === true)}
        />
        <label
          htmlFor={id}
          className="flex min-w-0 cursor-pointer select-none flex-wrap items-center gap-x-2 gap-y-1"
        >
          <span>{label}</span>
          <span
            className={cn(
              "text-label-12-medium tracking-normal",
              requirementLabel === "필수" ? "text-green-500" : "text-gray-400",
            )}
          >
            {requirementLabel}
          </span>
        </label>
      </div>
      {error ? (
        <p
          className="mt-2 pl-6 text-label-12-medium tracking-normal text-red-500"
          id={errorId}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function getSignupFormErrors(
  form: SignupFormState,
  termsAccepted: boolean,
): SignupFormErrors {
  const errors: SignupFormErrors = {};
  const email = form.email.trim();

  if (!form.name.trim()) {
    errors.name = "이름을 입력해 주세요.";
  }

  if (!email) {
    errors.email = "이메일을 입력해 주세요.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "이메일 형식이 올바르지 않습니다.";
  }

  if (!form.password) {
    errors.password = "비밀번호를 입력해 주세요.";
  } else if (form.password.length < 8) {
    errors.password = "비밀번호는 최소 8자 이상이어야 합니다.";
  } else if (!/[A-Za-z]/.test(form.password)) {
    errors.password = "비밀번호는 영문을 포함해야 합니다.";
  } else if (!/\d/.test(form.password)) {
    errors.password = "비밀번호는 숫자를 포함해야 합니다.";
  }

  if (!form.passwordConfirm) {
    errors.passwordConfirm = "비밀번호를 한 번 더 입력해 주세요.";
  } else if (form.password !== form.passwordConfirm) {
    errors.passwordConfirm = "비밀번호 확인이 일치하지 않습니다.";
  }

  if (!termsAccepted) {
    errors.terms = "서비스 이용약관과 개인정보 처리방침에 동의해 주세요.";
  }

  return errors;
}

function hasSignupFormErrors(errors: SignupFormErrors) {
  return Boolean(
    errors.name ||
      errors.email ||
      errors.password ||
      errors.passwordConfirm ||
      errors.terms,
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
