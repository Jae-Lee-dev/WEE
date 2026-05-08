import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  ref?: Ref<HTMLButtonElement>;
  children: ReactNode;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-green-400 text-white",
  secondary: "bg-white text-gray-800 border border-gray-200",
  danger: "bg-white text-red-500 border border-red-500",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      className={`text-h-18-semibold inline-flex items-center justify-center rounded-[10px] px-6 py-3 disabled:cursor-not-allowed disabled:opacity-50 ${variantStyles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
