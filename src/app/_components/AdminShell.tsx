"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import {
  adminSections,
  findSectionByPath,
  type AdminIconName,
  type AdminSection,
  type AdminTab,
} from "@/app/_config/admin-navigation";
import { HeaderNotificationSlot } from "@/app/_components/HeaderNotificationSlot";
import { SlidingTabTextMask } from "@/components/ui/sliding-tab-text-mask";
import { useSlidingTabIndicator } from "@/components/ui/use-sliding-tab-indicator";
import { demoWorkspace } from "@/app/_data/admin-demo";

const shellIconPathMap: Record<AdminIconName, string> = {
  dashboard: "/admin-shell/icon-home.svg",
  workers: "/admin-shell/icon-person.svg",
  schedule: "/admin-shell/icon-calendar.svg",
  records: "/admin-shell/icon-note.svg",
  payroll: "/admin-shell/icon-money.svg",
  handover: "/admin-shell/icon-book.svg",
  settings: "/admin-shell/icon-setting.svg",
};

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const currentSection = findSectionByPath(pathname);

  return (
    <div className="flex min-h-screen min-w-[1180px] bg-gray-100 text-gray-900">
      <AdminSidebar currentSection={currentSection} />
      <div className="min-w-0 flex-1 bg-gray-100">
        <AdminHeader
          title={currentSection.label}
          showInviteCodeAction={currentSection.key === "workers"}
        />
        <SectionTabs pathname={pathname} tabs={currentSection.tabs} />
        <main className="px-5 pb-5 pt-7">{children}</main>
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
          className="flex h-[68px] items-center gap-4 rounded-[8px] transition-colors duration-150 ease-out hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
        >
          <div className="relative size-12 shrink-0 overflow-hidden">
            <Image
              src="/admin-shell/logo.png"
              alt=""
              width={48}
              height={34}
              priority
              className="absolute left-1/2 top-1/2 h-[34px] w-12 -translate-x-1/2 -translate-y-1/2 object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="text-h-20 text-gray-800">Wee</div>
            <div className="truncate text-h-18-regular text-gray-600">
              {demoWorkspace.name}
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
        <Image
          src="/admin-shell/avatar.png"
          alt=""
          width={48}
          height={48}
          className="size-12 shrink-0 rounded-full"
        />
        <div className="min-w-0">
          <div className="truncate text-h-18-semibold text-gray-800">
            {demoWorkspace.managerName}
          </div>
          <div className="text-body-14-regular text-gray-500">
            {demoWorkspace.managerRole}
          </div>
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
      <SidebarIcon name={section.icon} />
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

function SidebarIcon({ name }: { name: AdminIconName }) {
  return (
    <span
      aria-hidden="true"
      className="size-5 shrink-0 bg-current"
      style={{
        WebkitMaskImage: `url(${shellIconPathMap[name]})`,
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskSize: "100% 100%",
        maskImage: `url(${shellIconPathMap[name]})`,
        maskRepeat: "no-repeat",
        maskSize: "100% 100%",
      }}
    />
  );
}

function AdminHeader({
  title,
  showInviteCodeAction,
}: {
  title: string;
  showInviteCodeAction: boolean;
}) {
  return (
    <header className="flex h-[92px] items-center justify-between border-b border-gray-200 bg-white px-5">
      <h1 className="text-h-20 text-gray-900">{title}</h1>
      <div className="flex items-center gap-5">
        {showInviteCodeAction ? (
          <button
            type="button"
            className="flex h-[42px] items-center justify-center rounded-full border border-gray-200 bg-white px-4 text-h-18-regular text-gray-700 shadow-[0px_1px_2px_rgba(17,24,39,0.03)] transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
          >
            참여 코드 복사
          </button>
        ) : null}
        <HeaderNotificationSlot />
      </div>
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
  const { indicatorStyle, itemStyles, listRef, slidingTabValueAttribute } =
    useSlidingTabIndicator<string, HTMLElement>({
      options: tabOptions,
      value: activeTabHref ?? "",
    });

  return (
    <div className="px-5 pt-7">
      <nav
        ref={listRef}
        className="group/section-tabs relative isolate flex h-[34px] items-end gap-8 overflow-hidden border-b border-gray-200"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 z-0 h-0.5 rounded-full bg-green-400 transition-opacity duration-150 ease-out"
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
              className={`relative z-10 flex h-[34px] items-start border-b-2 text-h-20 transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 ${
                active
                  ? "border-transparent text-gray-500 hover:text-gray-800 active:text-gray-900"
                  : "border-transparent text-gray-500 hover:border-gray-200 hover:text-gray-800 active:text-gray-900"
              }`}
            >
              <SlidingTabTextMask
                activeClassName="text-green-400 group-has-[[aria-current=page]:hover]/section-tabs:text-green-450 group-has-[[aria-current=page]:active]/section-tabs:text-green-500"
                indicatorStyle={indicatorStyle}
                itemStyle={itemStyles[tab.href]}
                overlayClassName="items-start justify-center"
              >
                {tab.label}
              </SlidingTabTextMask>
            </Link>
          );
        })}
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
