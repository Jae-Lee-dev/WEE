"use client";

import {
  type ChangeEvent,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  OptionSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  type SelectOption,
} from "@/components/ui/select";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";
import { createManagerUserDocument } from "./workspace-data-source";
import {
  persistWorkspaceOnboardingState,
} from "./workspace-onboarding-state";

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

const customEmailDomainValue = "__custom__";
const domainModeTransitionMs = 160;

const emailDomainOptions: SelectOption[] = [
  { label: "gmail.com", value: "gmail.com" },
  { label: "naver.com", value: "naver.com" },
  { label: "kakao.com", value: "kakao.com" },
  { label: "daum.net", value: "daum.net" },
  { label: "hanmail.net", value: "hanmail.net" },
  { label: "직접입력", value: customEmailDomainValue },
];

const passwordRequirements = [
  {
    id: "length",
    label: "8자 이상",
    isMet: (password: string) => password.length >= 8,
  },
  {
    id: "letter",
    label: "영문",
    isMet: (password: string) => /[A-Za-z]/.test(password),
  },
  {
    id: "number",
    label: "숫자",
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
  const [emailDomain, setEmailDomain] = useState("");
  const [customEmailDomain, setCustomEmailDomain] = useState("");

  const validationErrors = getSignupFormErrors(form, termsAccepted);
  const hasValidationErrors = hasSignupFormErrors(validationErrors);
  const alertMessage =
    firebaseErrorMessage ??
    (hasSubmitted && hasValidationErrors
      ? "입력 내용을 다시 확인해 주세요."
      : null);
  const visibleTermsError = hasSubmitted ? validationErrors.terms : undefined;

  const handleFieldChange =
    (field: SignupField) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
      setFirebaseErrorMessage(null);
    };

  const handleFieldBlur = (field: SignupField) => () => {
    setTouchedFields((current) => ({ ...current, [field]: true }));
  };

  const handleEmailLocalPartChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { domain, localPart } = parseEmailInput(event.target.value);
    const hasCustomDomain = Boolean(domain) && !isPresetEmailDomain(domain);
    const nextDomain = isPresetEmailDomain(domain)
      ? domain
      : hasCustomDomain
        ? customEmailDomainValue
        : emailDomain;
    const nextCustomEmailDomain = hasCustomDomain ? domain : customEmailDomain;

    if (isPresetEmailDomain(domain)) {
      setEmailDomain(domain);
    } else if (hasCustomDomain) {
      setEmailDomain(customEmailDomainValue);
      setCustomEmailDomain(domain);
    }

    setForm((current) => ({
      ...current,
      email: buildEmailAddress(
        localPart,
        getEmailDomainValue(nextDomain, nextCustomEmailDomain),
      ),
    }));
    setFirebaseErrorMessage(null);
  };

  const handleEmailDomainChange = (domain: string) => {
    setEmailDomain(domain);

    if (domain !== customEmailDomainValue) {
      setCustomEmailDomain("");
    }

    setForm((current) => ({
      ...current,
      email: buildEmailAddress(
        getEmailLocalPart(current.email),
        getEmailDomainValue(
          domain,
          domain === customEmailDomainValue ? customEmailDomain : "",
        ),
      ),
    }));
    setFirebaseErrorMessage(null);
  };

  const handleCustomEmailDomainChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const domain = normalizeEmailDomainInput(event.target.value);

    setCustomEmailDomain(domain);
    setEmailDomain(customEmailDomainValue);
    setForm((current) => ({
      ...current,
      email: buildEmailAddress(getEmailLocalPart(current.email), domain),
    }));
    setFirebaseErrorMessage(null);
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
      await createManagerUserDocument(credential.user);
      persistWorkspaceOnboardingState({
        status: "missing",
        userId: credential.user.uid,
        workspaceId: null,
      });

      router.push("/onboarding/workspace");
    } catch (error) {
      setFirebaseErrorMessage(getSignupErrorMessage(error));
      setIsSubmitting(false);
    }
  }

  return (
    <form className="w-full" onSubmit={handleSubmit} noValidate>
      <div className="space-y-3">
        <SignupTextField
          id="signup-name"
          label="이름"
          autoComplete="name"
          value={form.name}
          onChange={handleFieldChange("name")}
          onBlur={handleFieldBlur("name")}
          error={getVisibleFieldError("name")}
          required
          autoFocus
          disabled={isSubmitting}
        />
        <SignupEmailField
          id="signup-email"
          label="이메일"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          localPart={getEmailLocalPart(form.email)}
          domain={emailDomain}
          customDomain={customEmailDomain}
          onChange={handleEmailLocalPartChange}
          onBlur={handleFieldBlur("email")}
          onCustomDomainChange={handleCustomEmailDomainChange}
          onCustomDomainBlur={handleFieldBlur("email")}
          onDomainChange={handleEmailDomainChange}
          placeholder="이메일 아이디"
          error={getVisibleFieldError("email")}
          required
          disabled={isSubmitting}
        />
        <SignupPasswordField
          id="signup-password"
          label="비밀번호"
          descriptionId="signup-password-guidance"
          isVisible={isPasswordVisible}
          onToggleVisibility={() => setIsPasswordVisible((current) => !current)}
          autoComplete="new-password"
          spellCheck={false}
          value={form.password}
          onChange={handleFieldChange("password")}
          onBlur={handleFieldBlur("password")}
          placeholder="8자 이상"
          error={getVisibleFieldError("password")}
          required
          disabled={isSubmitting}
        >
          <PasswordGuidance password={form.password} />
        </SignupPasswordField>
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

      <div className="mt-5">
        <div className="space-y-3">
          <SignupCheckbox
            id="signup-terms"
            checked={termsAccepted}
            disabled={isSubmitting}
            label="서비스 이용약관과 개인정보 처리방침에 동의합니다."
            requirementLabel="필수"
            error={visibleTermsError}
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
        <SignupFieldError
          className="mt-3 pl-6"
          id="signup-terms-error"
          message={visibleTermsError}
        />
      </div>

      <SignupAlert message={alertMessage} />

      <Button
        className="mt-4 h-[50px] w-full rounded-[8px] text-h-18-semibold tracking-normal"
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
      <SignupFieldError id={errorId} message={error} />
    </div>
  );
}

function SignupEmailField({
  id,
  label,
  error,
  className,
  onDomainChange,
  onCustomDomainChange,
  onCustomDomainBlur,
  customDomain,
  domain,
  localPart,
  disabled,
  ...props
}: ComponentProps<typeof Input> & {
  id: string;
  label: string;
  customDomain: string;
  domain: string;
  error?: string;
  localPart: string;
  onCustomDomainBlur: () => void;
  onCustomDomainChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDomainChange: (domain: string) => void;
}) {
  const errorId = `${id}-error`;
  const isCustomDomain = domain === customEmailDomainValue;
  const domainModeTransitionTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  useEffect(() => {
    return () => {
      if (domainModeTransitionTimeoutRef.current) {
        clearTimeout(domainModeTransitionTimeoutRef.current);
      }
    };
  }, []);

  const handleDomainOptionChange = (nextDomain: string) => {
    const isNextCustomDomain = nextDomain === customEmailDomainValue;

    if (domainModeTransitionTimeoutRef.current) {
      clearTimeout(domainModeTransitionTimeoutRef.current);
      domainModeTransitionTimeoutRef.current = null;
    }

    if (isNextCustomDomain === isCustomDomain) {
      onDomainChange(nextDomain);
      return;
    }

    domainModeTransitionTimeoutRef.current = setTimeout(() => {
      onDomainChange(nextDomain);
      domainModeTransitionTimeoutRef.current = null;
    }, domainModeTransitionMs);
  };

  return (
    <div className={cn("block", className)}>
      <label
        className="mb-2 block text-label-14-medium tracking-normal text-gray-700"
        htmlFor={id}
      >
        {label}
      </label>
      <div
        className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-2"
        data-testid="signup-email-control"
      >
        <Input
          id={id}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          className="h-12 rounded-[8px] border-gray-200 text-body-16-regular tracking-normal focus-visible:border-gray-300 focus-visible:ring-gray-100"
          type="text"
          value={localPart}
          disabled={disabled}
          {...props}
        />
        <span className="select-none text-body-16-medium tracking-normal text-gray-500">
          @
        </span>
        {isCustomDomain ? (
          <div className="col-start-3 grid min-w-0 grid-cols-[minmax(0,1fr)_48px]">
            <Input
              aria-describedby={error ? errorId : undefined}
              aria-invalid={error ? true : undefined}
              aria-label="이메일 도메인 직접 입력"
              autoCapitalize="none"
              autoComplete="off"
              className="h-12 rounded-r-none border-gray-200 text-body-16-regular tracking-normal focus-visible:border-gray-300 focus-visible:ring-gray-100"
              disabled={disabled}
              inputMode="email"
              onBlur={onCustomDomainBlur}
              onChange={onCustomDomainChange}
              placeholder="example.com"
              spellCheck={false}
              type="text"
              value={customDomain}
            />
            <Select
              disabled={disabled}
              onValueChange={handleDomainOptionChange}
              value={domain}
            >
              <SelectTrigger
                aria-label="이메일 도메인 선택"
                className="flex h-12 min-h-12 w-12 items-center justify-center gap-0 rounded-l-none rounded-r-[8px] border-l-0 border-gray-200 p-0 focus-visible:border-gray-300 focus-visible:ring-gray-100 [&_svg]:mx-0 [&_svg]:text-gray-400"
              />
              <SelectContent>
                {emailDomainOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    className="py-2 text-body-14-medium"
                    disabled={option.disabled}
                    value={option.value}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <OptionSelect
            disabled={disabled}
            itemClassName="py-2 text-body-14-medium"
            onValueChange={handleDomainOptionChange}
            options={emailDomainOptions}
            placeholder="선택"
            triggerAriaDescribedBy={error ? errorId : undefined}
            triggerAriaInvalid={error ? true : undefined}
            triggerAriaLabel="이메일 도메인 선택"
            triggerClassName="h-12 min-h-12 w-full rounded-[8px] border-gray-200 px-3 text-body-14-medium tracking-normal focus-visible:border-gray-300 focus-visible:ring-gray-100 data-placeholder:text-gray-400 [&_svg]:text-gray-400"
            value={domain}
          />
        )}
      </div>
      <SignupFieldError id={errorId} message={error} />
    </div>
  );
}

function SignupPasswordField({
  children,
  id,
  label,
  isVisible,
  onToggleVisibility,
  error,
  descriptionId,
  className,
  ...props
}: ComponentProps<typeof Input> & {
  children?: ReactNode;
  id: string;
  label: string;
  isVisible: boolean;
  onToggleVisibility: () => void;
  descriptionId?: string;
  error?: string;
}) {
  const errorId = `${id}-error`;
  const describedBy = [descriptionId, error ? errorId : undefined]
    .filter(Boolean)
    .join(" ");
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
          aria-describedby={describedBy || undefined}
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
      <SignupFieldError id={errorId} message={error} />
      {children ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}

function PasswordGuidance({ password }: { password: string }) {
  const metCount = passwordRequirements.filter((requirement) =>
    requirement.isMet(password),
  ).length;
  const strength = getPasswordStrength(metCount, password);

  return (
    <div
      id="signup-password-guidance"
      className="space-y-2"
      aria-live="polite"
      data-testid="password-guidance"
    >
      <div className="flex items-center justify-end">
        <span
          className={cn(
            "shrink-0 text-label-12-medium tracking-normal",
            strength.tone === "green"
              ? "text-green-500"
              : strength.tone === "orange"
                ? "text-orange-400"
                : "text-gray-400",
          )}
          data-strength={strength.id}
          data-testid="password-strength"
        >
          {strength.label}
        </span>
      </div>
      <ul
        className="grid grid-cols-3 gap-1.5"
        data-testid="password-strength-meter"
      >
        {passwordRequirements.map((requirement) => {
          const isMet = requirement.isMet(password);

          return (
            <li
              key={requirement.id}
              className={cn(
                "min-w-0 space-y-1.5 text-label-12-medium tracking-normal transition-colors",
                isMet ? "text-green-500" : "text-gray-400",
              )}
              data-state={isMet ? "met" : "unmet"}
              data-testid={`password-requirement-${requirement.id}`}
            >
              <span
                className={cn(
                  "block h-1.5 rounded-full transition-colors",
                  isMet ? "bg-green-400" : "bg-gray-100",
                )}
                aria-hidden="true"
              />
              <span className="block truncate text-center">
                {requirement.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function getPasswordStrength(metCount: number, password: string) {
  if (!password) {
    return { id: "empty", label: "입력 전", tone: "grey" } as const;
  }

  if (metCount === passwordRequirements.length) {
    return { id: "safe", label: "안전", tone: "green" } as const;
  }

  if (metCount >= 2) {
    return { id: "medium", label: "보통", tone: "orange" } as const;
  }

  return { id: "weak", label: "낮음", tone: "grey" } as const;
}

function parseEmailInput(value: string) {
  const [rawLocalPart = "", rawDomain = ""] = value.split("@");

  return {
    domain: rawDomain.trim().toLowerCase(),
    localPart: rawLocalPart.trim(),
  };
}

function getEmailLocalPart(email: string) {
  return parseEmailInput(email).localPart;
}

function buildEmailAddress(localPart: string, domain: string) {
  const trimmedLocalPart = localPart.trim();

  if (!trimmedLocalPart) {
    return "";
  }

  return domain ? `${trimmedLocalPart}@${domain}` : trimmedLocalPart;
}

function getEmailDomainValue(domain: string, customDomain: string) {
  return domain === customEmailDomainValue ? customDomain : domain;
}

function isPresetEmailDomain(domain: string) {
  return emailDomainOptions.some(
    (option) =>
      option.value !== customEmailDomainValue && option.value === domain,
  );
}

function normalizeEmailDomainInput(value: string) {
  return value.trim().replace(/^@+/, "").toLowerCase();
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
    </div>
  );
}

function SignupFieldError({
  className,
  id,
  message,
}: {
  className?: string;
  id: string;
  message?: string;
}) {
  return (
    <p
      aria-hidden={message ? undefined : true}
      className={cn(
        "mt-2 h-[17px] overflow-hidden text-label-12-medium tracking-normal text-red-500 transition-opacity duration-150",
        message ? "opacity-100" : "opacity-0",
        className,
      )}
      id={id}
    >
      {message}
    </p>
  );
}

function SignupAlert({ message }: { message: string | null }) {
  return (
    <p
      aria-hidden={message ? undefined : true}
      className={cn(
        "mt-3 h-[17px] overflow-hidden text-label-12-medium tracking-normal transition-[color,opacity] duration-150",
        message ? "text-red-500 opacity-100" : "text-transparent opacity-0",
      )}
      data-testid="signup-alert"
      role={message ? "alert" : undefined}
    >
      {message}
    </p>
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
  } else if (!email.includes("@")) {
    errors.email = "이메일 도메인을 입력하거나 선택해 주세요.";
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
