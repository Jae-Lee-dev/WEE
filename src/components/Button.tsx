import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  ref?: Ref<HTMLButtonElement>;
  children: ReactNode;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-green-400 text-white hover:bg-green-450 active:bg-green-500 focus-visible:ring-green-200",
  secondary:
    "border border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100 focus-visible:ring-gray-200",
  danger:
    "border border-red-500 bg-white text-red-500 hover:bg-red-50 active:bg-red-100 focus-visible:ring-red-100",
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
      className={`text-h-18-semibold inline-flex items-center justify-center rounded-[10px] px-6 py-3 transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variantStyles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
