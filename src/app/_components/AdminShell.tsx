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
import { IconChevronLeft } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
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
  const workerDetail = isWorkerDetailPath(pathname);

  return (
    <div className="flex h-screen min-w-[1180px] overflow-hidden bg-gray-100 text-gray-900">
      <AdminSidebar currentSection={currentSection} />
      <div className="min-h-0 min-w-0 flex-1 bg-gray-100">
        <div className="h-full overflow-y-auto overscroll-contain">
          <AdminHeader
            title={workerDetail ? "조교 상세" : currentSection.label}
            backHref={workerDetail ? "/workers" : undefined}
            showInviteCodeAction={currentSection.key === "workers"}
          />
          {workerDetail ? null : (
            <SectionTabs pathname={pathname} tabs={currentSection.tabs} />
          )}
          <main className="px-4 pb-4 pt-5 2xl:px-5 2xl:pb-5 2xl:pt-7">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function isWorkerDetailPath(pathname: string) {
  return (
    pathname.startsWith("/workers/") &&
    !pathname.startsWith("/workers/applications") &&
    !pathname.startsWith("/workers/tags")
  );
}

function AdminSidebar({
  currentSection,
}: {
  currentSection: AdminSection;
}) {
  return (
    <aside className="sticky top-0 flex h-screen w-[260px] shrink-0 flex-col justify-between border-r border-gray-100 bg-white px-4 py-4 2xl:w-[300px] 2xl:px-4 2xl:py-5">
      <div>
        <Link
          href="/dashboard"
          className="flex h-[58px] items-center gap-3 rounded-[8px] transition-colors duration-150 ease-out hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 2xl:h-[68px] 2xl:gap-4"
        >
          <div className="relative size-11 shrink-0 overflow-hidden 2xl:size-12">
            <Image
              src="/admin-shell/logo.png"
              alt=""
              width={48}
              height={34}
              priority
              className="absolute left-1/2 top-1/2 h-8 w-11 -translate-x-1/2 -translate-y-1/2 object-contain 2xl:h-[34px] 2xl:w-12"
            />
          </div>
          <div className="min-w-0">
            <div className="text-h-18-semibold text-gray-800 2xl:text-h-20">
              Wee
            </div>
            <div className="truncate text-h-16-medium text-gray-600 2xl:text-h-18-regular">
              {demoWorkspace.name}
            </div>
          </div>
        </Link>

        <SidebarSeparator className="my-3.5 2xl:my-5" />

        <nav className="flex flex-col gap-1.5 2xl:gap-2" aria-label="관리자 메뉴">
          <div className="space-y-1.5 2xl:space-y-2">
            {adminSections.slice(0, 5).map((section) => (
              <SidebarItem
                key={section.key}
                section={section}
                active={currentSection.key === section.key}
              />
            ))}
          </div>
          <SidebarSeparator />
          <SidebarItem
            section={adminSections[5]}
            active={currentSection.key === adminSections[5].key}
          />
          <SidebarSeparator />
          <SidebarItem
            section={adminSections[6]}
            active={currentSection.key === adminSections[6].key}
          />
        </nav>
      </div>

      <div className="flex items-center gap-3 rounded-[8px] px-1 py-2 2xl:gap-3 2xl:py-2">
        <Image
          src="/admin-shell/avatar.png"
          alt=""
          width={48}
          height={48}
          className="size-10 shrink-0 rounded-full 2xl:size-12"
        />
        <div className="min-w-0">
          <div className="truncate text-h-16-semibold text-gray-800 2xl:text-h-18-semibold">
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

function SidebarSeparator({ className = "" }: { className?: string }) {
  return <div className={`h-px bg-gray-100 ${className}`} />;
}

function SidebarItem({
  section,
  active,
}: {
  section: AdminSection;
  active: boolean;
}) {
  return (
    <Link
      href={section.href}
      aria-current={active ? "page" : undefined}
      className={`flex h-11 w-full items-center gap-3.5 rounded-[8px] px-3.5 py-2.5 transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 2xl:h-[50px] 2xl:gap-4 2xl:px-4 2xl:py-3 ${
        active
          ? "bg-gray-50 text-green-400 active:bg-gray-100"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-800 active:bg-gray-100"
      }`}
    >
      <SidebarIcon name={section.icon} />
      <span
        className={`min-w-0 flex-1 truncate ${
          active
            ? "text-h-16-semibold 2xl:text-h-18-semibold"
            : "text-h-16-medium 2xl:text-h-18-regular"
        }`}
      >
        {section.label}
      </span>
      {section.badge ? (
        <Badge
          variant={section.badgeTone === "ai" ? "green" : "greenSolid"}
          size={section.badgeTone === "ai" ? "M" : "count"}
          shape={section.badgeTone === "ai" ? "default" : "pill"}
          className={section.badgeTone === "ai" ? "text-green-300" : undefined}
        >
          {section.badge}
        </Badge>
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
  backHref,
  showInviteCodeAction,
}: {
  title: string;
  backHref?: string;
  showInviteCodeAction: boolean;
}) {
  return (
    <header className="flex h-[88px] shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5 2xl:h-[108px] 2xl:px-5">
      <div className="flex items-center gap-4">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="조교 목록으로 돌아가기"
            className="flex size-6 items-center justify-center text-gray-800 transition-colors duration-150 ease-out hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
          >
            <IconChevronLeft className="size-6" />
          </Link>
        ) : null}
        <h1 className="text-h-20 text-gray-900">{title}</h1>
      </div>
      <div className="flex items-center gap-5">
        {showInviteCodeAction ? (
          <button
            type="button"
            className="flex h-10 items-center justify-center rounded-full border border-gray-200 bg-white px-4 text-h-16-medium text-gray-700 shadow-[0px_1px_2px_rgba(17,24,39,0.03)] transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 2xl:h-[42px] 2xl:px-4 2xl:text-h-18-regular"
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
    <div className="sticky top-0 z-30 bg-gray-100 px-5 pt-5 2xl:px-5 2xl:pt-7">
      <nav
        ref={listRef}
        className="group/section-tabs relative isolate flex h-11 items-end gap-8 overflow-hidden border-b border-gray-200 2xl:h-11 2xl:gap-8"
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
          const showWorkersApplicationBadge =
            tab.href === "/workers/applications" && pathname !== "/workers";
          const showScheduleApprovalBadge =
            tab.href === "/schedule" && pathname.startsWith("/schedule");
          const fallbackBadge =
            showWorkersApplicationBadge || showScheduleApprovalBadge ? "6" : undefined;
          const badge = tab.badge ?? fallbackBadge;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              {...{ [slidingTabValueAttribute]: tab.href }}
              className={`relative z-10 flex h-11 items-start border-b-2 text-h-18-semibold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 2xl:h-11 2xl:text-h-20 ${
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
                <span className="flex items-center gap-2 pt-1">
                  <span>{tab.label}</span>
                  {badge ? (
                    <Badge variant="greenSolid" size="count" shape="pill">
                      {badge}
                    </Badge>
                  ) : null}
                </span>
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
