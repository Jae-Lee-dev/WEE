import Link from "next/link";
import type { InputHTMLAttributes } from "react";
import { entryRoutes } from "@/shared/config/admin-navigation";

type EntryField = {
  label: string;
  type?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder: string;
};

type EntryRoutePageProps = {
  title: string;
  description: string;
  fields: EntryField[];
  actionLabel: string;
  actionHref: string;
};

export function EntryRoutePage({
  title,
  description,
  fields,
  actionLabel,
  actionHref,
}: EntryRoutePageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-10">
      <section className="w-full max-w-[420px] rounded-[10px] border border-gray-200 bg-white px-8 py-7">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-[10px] bg-green-400 text-h-24 text-white">
            W
          </div>
          <div>
            <div className="text-h-20 text-gray-800">Wee</div>
            <div className="text-body-14-regular text-gray-500">관리자</div>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-h-24 text-gray-900">{title}</h1>
          <p className="mt-2 text-body-14-regular text-gray-500">
            {description}
          </p>
        </div>

        <div className="space-y-4">
          {fields.map((field) => (
            <label key={field.label} className="block">
              <span className="mb-2 block text-label-14-medium text-gray-700">
                {field.label}
              </span>
              <input
                type={field.type ?? "text"}
                inputMode={field.inputMode}
                placeholder={field.placeholder}
                className="h-11 w-full rounded-[6px] border border-gray-200 bg-white px-3 text-body-14-regular text-gray-800 outline-none transition-colors duration-150 ease-out placeholder:text-gray-400 hover:border-gray-300 focus:border-green-400 focus:ring-2 focus:ring-green-100"
              />
            </label>
          ))}
        </div>

        <Link
          href={actionHref}
          className="mt-7 flex h-12 w-full items-center justify-center rounded-[10px] bg-green-400 px-6 text-h-18-semibold text-white transition-colors duration-150 ease-out hover:bg-green-450 active:bg-green-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 focus-visible:ring-offset-2"
        >
          {actionLabel}
        </Link>

        <nav className="mt-6 flex flex-wrap gap-x-4 gap-y-2" aria-label="진입 메뉴">
          {entryRoutes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className="text-label-12-medium text-gray-500 transition-colors duration-150 ease-out hover:text-green-400 active:text-green-500"
            >
              {route.label}
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}
