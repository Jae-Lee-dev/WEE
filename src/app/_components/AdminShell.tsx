"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, type ComponentType, type ReactNode } from "react";
import {
  IconBook,
  IconCalendar,
  IconHome,
  IconMoney,
  IconNote,
  IconNotice,
  IconPerson,
  IconSetting,
} from "@/components/icons";
import {
  adminSections,
  findSectionByPath,
  type AdminIconName,
  type AdminSection,
  type AdminTab,
} from "@/app/_config/admin-navigation";
import { SlidingTabTextMask } from "@/components/ui/sliding-tab-text-mask";
import { useSlidingTabIndicator } from "@/components/ui/use-sliding-tab-indicator";

type IconComponent = ComponentType<{ className?: string }>;

const iconMap: Record<AdminIconName, IconComponent> = {
  dashboard: IconHome,
  workers: IconPerson,
  schedule: IconCalendar,
  records: IconNote,
  payroll: IconMoney,
  handover: IconBook,
  settings: IconSetting,
};

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const currentSection = findSectionByPath(pathname);

  return (
    <div className="flex min-h-screen min-w-[1180px] bg-white text-gray-900">
      <AdminSidebar currentSection={currentSection} />
      <div className="min-w-0 flex-1">
        <AdminHeader title={currentSection.label} />
        <SectionTabs pathname={pathname} tabs={currentSection.tabs} />
        <main className="px-5 pb-12 pt-7">{children}</main>
      </div>
    </div>
  );
}

function AdminSidebar({
  currentSection,
}: {
  currentSection: AdminSection;
}) {
  return (
    <aside className="sticky top-0 flex h-screen w-[300px] shrink-0 flex-col justify-between border-r border-gray-100 bg-white px-4 py-5">
      <div>
        <Link
          href="/dashboard"
          className="flex h-[72px] items-center gap-3 rounded-[8px] px-1 transition-colors duration-150 ease-out hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
        >
          <div className="flex size-12 shrink-0 items-center justify-center rounded-[10px] bg-green-400 text-h-24 text-white">
            W
          </div>
          <div className="min-w-0">
            <div className="text-h-20 text-gray-800">Wee</div>
            <div className="truncate text-h-18-regular text-gray-600">
              Wee 학원
            </div>
          </div>
        </Link>

        <div className="my-5 h-px bg-gray-100" />

        <nav className="space-y-2" aria-label="관리자 메뉴">
          {adminSections.map((section) => (
            <SidebarItem
              key={section.key}
              section={section}
              active={currentSection.key === section.key}
            />
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3 rounded-[8px] px-1 py-2">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-h-18-semibold text-green-400">
          김
        </div>
        <div className="min-w-0">
          <div className="truncate text-h-18-semibold text-gray-800">김민채</div>
          <div className="text-body-14-regular text-gray-500">관리자</div>
        </div>
      </div>
    </aside>
  );
}

function SidebarItem({
  section,
  active,
}: {
  section: AdminSection;
  active: boolean;
}) {
  const Icon = iconMap[section.icon];
  const badgeClassName =
    section.badgeTone === "ai"
      ? "bg-green-100 text-green-300"
      : "bg-green-400 text-white";

  return (
    <Link
      href={section.href}
      aria-current={active ? "page" : undefined}
      className={`flex h-[50px] w-[268px] items-center gap-4 rounded-[8px] px-4 py-3 transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 ${
        active
          ? "bg-gray-50 text-green-400 active:bg-gray-100"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-800 active:bg-gray-100"
      }`}
    >
      <Icon className="size-6 shrink-0" />
      <span
        className={`min-w-0 flex-1 truncate ${
          active ? "text-h-18-semibold" : "text-h-18-regular"
        }`}
      >
        {section.label}
      </span>
      {section.badge ? (
        <span
          className={`rounded-[4px] px-1.5 py-0.5 text-detail-16-semibold ${badgeClassName}`}
        >
          {section.badge}
        </span>
      ) : null}
    </Link>
  );
}

function AdminHeader({ title }: { title: string }) {
  return (
    <header className="flex h-[92px] items-center justify-between px-5">
      <h1 className="text-h-20 text-gray-900">{title}</h1>
      <button
        type="button"
        aria-label="알림"
        className="flex size-10 items-center justify-center rounded-[8px] text-gray-600 transition-colors duration-150 ease-out hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
      >
        <IconNotice hasNotice className="size-6" />
      </button>
    </header>
  );
}

function SectionTabs({
  pathname,
  tabs,
}: {
  pathname: string;
  tabs: AdminTab[];
}) {
  const activeTabHref = findActiveTabHref(pathname, tabs);
  const tabOptions = useMemo(
    () =>
      tabs.map((tab) => ({
        value: tab.href,
        label: tab.label,
      })),
    [tabs],
  );
  const { indicatorStyle, listRef, slidingTabValueAttribute } =
    useSlidingTabIndicator<string, HTMLElement>({
      options: tabOptions,
      value: activeTabHref ?? "",
    });

  return (
    <div className="px-5 pt-7">
      <nav
        ref={listRef}
        className="relative isolate flex h-[34px] items-end gap-8 overflow-hidden border-b border-gray-200"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 z-0 h-0.5 rounded-full bg-green-400 transition-[opacity,transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            opacity: indicatorStyle ? 1 : 0,
            width: indicatorStyle?.width ?? 0,
            transform: `translateX(${indicatorStyle?.x ?? 0}px)`,
          }}
        />
        {tabs.map((tab) => {
          const active = activeTabHref === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              {...{ [slidingTabValueAttribute]: tab.href }}
              className={`relative z-10 flex h-[34px] items-start border-b-2 text-h-18-semibold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 ${
                active
                  ? "border-transparent text-gray-500 hover:text-gray-800 active:text-gray-900"
                  : "border-transparent text-gray-500 hover:border-gray-200 hover:text-gray-800 active:text-gray-900"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
        <SlidingTabTextMask
          indicatorStyle={indicatorStyle}
          options={tabOptions}
          variant="line"
        />
      </nav>
    </div>
  );
}

function findActiveTabHref(pathname: string, tabs: AdminTab[]) {
  return [...tabs]
    .sort((left, right) => right.href.length - left.href.length)
    .find(
      (tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`),
    )?.href;
}
