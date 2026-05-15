"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, ChevronRight, Copy, LogOut, X } from "lucide-react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import {
  adminSections,
  findSectionByPath,
  type AdminIconName,
  type AdminSection,
  type AdminTab,
} from "@/shared/config/admin-navigation";
import {
  createAdminShellBadgeDataSource,
  type AdminShellBadgeCounts,
} from "@/features/dashboard";
import {
  createWorkerApplicationsDataSource,
  workerApplicationsCountChangedEvent,
} from "@/features/workers";
import { HeaderNotificationSlot } from "./header-notification-slot";
import { Badge } from "@/shared/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { SlidingTabTextMask } from "@/shared/ui/sliding-tab-text-mask";
import { useSlidingTabIndicator } from "@/shared/ui/use-sliding-tab-indicator";
import { clearActiveWorkspaceUser } from "@/entities/workspace";
import { createSettingsWorkspaceDataSource } from "@/entities/workspace";
import { getFirebaseAuth } from "@/shared/api/firebase/client";

const shellIconPathMap: Record<AdminIconName, string> = {
  dashboard: "/admin-shell/icon-home.svg",
  workers: "/admin-shell/icon-person.svg",
  schedule: "/admin-shell/icon-calendar.svg",
  records: "/admin-shell/icon-note.svg",
  payroll: "/admin-shell/icon-money.svg",
  handover: "/admin-shell/icon-book.svg",
  settings: "/admin-shell/icon-setting.svg",
};

const managerRoleLabel = "관리자";
const loadingWorkspaceName = "소속 확인 중";
const loadingManagerName = "계정 확인 중";
const fallbackWorkspaceName = "소속 확인 필요";
const fallbackManagerName = "관리자";
const emptyAdminShellBadgeCounts = {
  recordPendingItems: 0,
  scheduleApprovals: 0,
  workerApplications: 0,
} as const satisfies AdminShellBadgeCounts;

type AdminShellAccount = {
  isLoading: boolean;
  managerEmail: string | null;
  managerName: string;
  managerRole: string;
  workspaceCode: string | null;
  workspaceName: string;
};

type HeaderBreadcrumb = {
  href: string;
  label: string;
};

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const currentSection = findSectionByPath(pathname);
  const workerDetail = isWorkerDetailPath(pathname);
  const account = useAdminShellAccount();
  const badgeCounts = useAdminShellBadgeCounts();
  const breadcrumbs = useMemo(
    () => createHeaderBreadcrumbs(pathname, currentSection),
    [currentSection, pathname],
  );

  return (
    <div
      className="flex h-screen min-w-[1040px] overflow-hidden bg-gray-100 text-gray-900"
      data-admin-shell="compact"
    >
      <AdminSidebar
        account={account}
        badgeCounts={badgeCounts}
        currentSection={currentSection}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-gray-100">
        <AdminHeader
          breadcrumbs={breadcrumbs}
          inviteCode={account.workspaceCode}
          isInviteCodeLoading={account.isLoading}
        />
        {workerDetail ? null : (
          <SectionTabs
            badgeCounts={badgeCounts}
            pathname={pathname}
            tabs={currentSection.tabs}
          />
        )}
        <main
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3 pt-3 [scrollbar-gutter:stable]"
          data-testid="admin-shell-content-scroll"
        >
          {children}
        </main>
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
  account,
  badgeCounts,
  currentSection,
}: {
  account: AdminShellAccount;
  badgeCounts: AdminShellBadgeCounts;
  currentSection: AdminSection;
}) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await signOut(getFirebaseAuth());
    } catch {
      setIsLoggingOut(false);
    } finally {
      clearActiveWorkspaceUser();
      router.replace("/login");
    }
  }

  return (
    <aside className="sticky top-0 flex h-screen w-[232px] shrink-0 flex-col justify-between border-r border-gray-100 bg-white pb-3">
      <div>
        <div
          className="flex h-[72px] items-center border-b border-gray-200 px-3"
          data-testid="sidebar-logo-header"
        >
          <Link
            href="/dashboard"
            className="flex h-12 items-center gap-2.5 rounded-[8px] transition-colors duration-150 ease-out hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
          >
            <div className="relative size-9 shrink-0 overflow-hidden">
              <Image
                src="/admin-shell/logo.png"
                alt=""
                width={48}
                height={34}
                priority
                className="absolute left-1/2 top-1/2 h-7 w-10 -translate-x-1/2 -translate-y-1/2 object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="text-h-16-semibold text-gray-800">
                Wee
              </div>
              <div
                className="truncate text-h-14-regular text-gray-600"
                data-testid="sidebar-workspace-name"
              >
                {account.workspaceName}
              </div>
            </div>
          </Link>
        </div>

        <nav
          className="mt-3 flex flex-col gap-1.5 px-3"
          aria-label="관리자 메뉴"
        >
          <div className="space-y-1.5">
            {adminSections.slice(0, 5).map((section) => (
              <SidebarItem
                key={section.key}
                badgeCounts={badgeCounts}
                section={section}
                active={currentSection.key === section.key}
              />
            ))}
          </div>
          <SidebarSeparator />
          <SidebarItem
            badgeCounts={badgeCounts}
            section={adminSections[5]}
            active={currentSection.key === adminSections[5].key}
          />
          <SidebarSeparator />
          <SidebarItem
            badgeCounts={badgeCounts}
            section={adminSections[6]}
            active={currentSection.key === adminSections[6].key}
          />
        </nav>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-busy={account.isLoading ? true : undefined}
            aria-label={`${account.managerName} 계정 메뉴`}
            className="mx-3 flex min-h-12 items-center justify-between gap-2.5 rounded-[8px] px-3 py-2 text-left transition-colors duration-150 ease-out hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
            data-testid="sidebar-account-trigger"
          >
            <span className="min-w-0">
              <span
                className="block truncate text-h-16-semibold text-gray-800"
                data-testid="sidebar-account-name"
              >
                {account.managerName}
              </span>
              <span className="block text-body-14-regular text-gray-500">
                {account.managerRole}
              </span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="top"
          sideOffset={8}
          className="w-[232px] rounded-[8px] border border-gray-200 bg-white p-1.5 shadow-[0_12px_32px_rgba(17,24,39,0.14)]"
        >
          <DropdownMenuLabel className="px-3 py-2">
            <span className="block truncate text-label-14-medium tracking-normal text-gray-900">
              {account.managerName}
            </span>
            <span className="mt-0.5 block text-label-12-regular tracking-normal text-gray-500">
              {account.managerEmail ?? account.managerRole}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1 bg-gray-100" />
          <DropdownMenuItem
            className="min-h-10 cursor-pointer gap-2.5 rounded-[8px] px-3 py-2 text-body-14-medium tracking-normal text-red-500 focus:bg-red-50 focus:text-red-500"
            disabled={isLoggingOut}
            onSelect={() => {
              void handleLogout();
            }}
            variant="destructive"
          >
            <LogOut className="size-4" strokeWidth={2.2} />
            <span>{isLoggingOut ? "로그아웃 중" : "로그아웃"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </aside>
  );
}

function useAdminShellAccount() {
  const [account, setAccount] = useState<AdminShellAccount>({
    isLoading: true,
    managerEmail: null,
    managerName: loadingManagerName,
    managerRole: managerRoleLabel,
    workspaceCode: null,
    workspaceName: loadingWorkspaceName,
  });

  useEffect(() => {
    let requestId = 0;

    const loadAccount = (user: User | null) => {
      const currentRequestId = requestId + 1;
      requestId = currentRequestId;
      const authProfile = getAuthProfile(user);

      setAccount({
        isLoading: true,
        managerEmail: authProfile.managerEmail,
        managerName: authProfile.managerName,
        managerRole: managerRoleLabel,
        workspaceCode: null,
        workspaceName: loadingWorkspaceName,
      });

      void createSettingsWorkspaceDataSource()
        .getWorkspace()
        .then((workspace) => {
          if (requestId !== currentRequestId) {
            return;
          }

          setAccount({
            isLoading: false,
            managerEmail: authProfile.managerEmail,
            managerName:
              normalizeDisplayText(workspace.managerName) ??
              authProfile.managerName,
            managerRole: managerRoleLabel,
            workspaceCode: normalizeDisplayText(workspace.code),
            workspaceName:
              normalizeDisplayText(workspace.name) ?? fallbackWorkspaceName,
          });
        })
        .catch(() => {
          if (requestId !== currentRequestId) {
            return;
          }

          setAccount({
            isLoading: false,
            managerEmail: authProfile.managerEmail,
            managerName: authProfile.managerName,
            managerRole: managerRoleLabel,
            workspaceCode: null,
            workspaceName: fallbackWorkspaceName,
          });
        });
    };

    let unsubscribe = () => {};

    try {
      unsubscribe = onAuthStateChanged(getFirebaseAuth(), loadAccount);
    } catch {
      loadAccount(null);
    }

    return () => {
      requestId += 1;
      unsubscribe();
    };
  }, []);

  return account;
}

function useAdminShellBadgeCounts() {
  const dataSource = useMemo(() => createAdminShellBadgeDataSource(), []);
  const workerApplicationsDataSource = useMemo(
    () => createWorkerApplicationsDataSource(),
    [],
  );
  const [counts, setCounts] = useState<AdminShellBadgeCounts>(
    emptyAdminShellBadgeCounts,
  );

  useEffect(() => {
    let active = true;

    void Promise.allSettled([
      dataSource.listBadgeCounts(),
      workerApplicationsDataSource.countApplications(),
    ]).then(([badgeCountsResult, workerApplicationsResult]) => {
      if (!active) {
        return;
      }

      const nextBadgeCounts =
        badgeCountsResult.status === "fulfilled"
          ? badgeCountsResult.value
          : emptyAdminShellBadgeCounts;
      const workerApplications =
        workerApplicationsResult.status === "fulfilled"
          ? workerApplicationsResult.value
          : 0;

      setCounts({
        ...nextBadgeCounts,
        workerApplications,
      });
    });

    return () => {
      active = false;
    };
  }, [dataSource, workerApplicationsDataSource]);

  useEffect(() => {
    function handleApplicationCountChanged(event: Event) {
      if (!(event instanceof CustomEvent)) {
        return;
      }

      const count = event.detail?.count;

      if (typeof count !== "number") {
        return;
      }

      setCounts((current) => ({
        ...current,
        workerApplications: count,
      }));
    }

    window.addEventListener(
      workerApplicationsCountChangedEvent,
      handleApplicationCountChanged,
    );

    return () => {
      window.removeEventListener(
        workerApplicationsCountChangedEvent,
        handleApplicationCountChanged,
      );
    };
  }, []);

  return counts;
}

function getAuthProfile(user: User | null) {
  const email = normalizeDisplayText(user?.email) ?? null;
  const displayName =
    normalizeDisplayText(user?.displayName) ??
    getEmailLocalPart(email) ??
    fallbackManagerName;

  return {
    managerEmail: email,
    managerName: displayName,
  };
}

function getEmailLocalPart(email: string | null) {
  const localPart = email?.split("@")[0];

  return normalizeDisplayText(localPart);
}

function normalizeDisplayText(value: string | null | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function SidebarSeparator({ className = "" }: { className?: string }) {
  return <div className={`h-px bg-gray-100 ${className}`} />;
}

function SidebarItem({
  badgeCounts,
  section,
  active,
}: {
  badgeCounts: AdminShellBadgeCounts;
  section: AdminSection;
  active: boolean;
}) {
  const sectionBadge = getSectionBadge(section, badgeCounts);

  return (
    <Link
      href={section.href}
      aria-current={active ? "page" : undefined}
      data-testid={`admin-sidebar-item-${section.key}`}
      className={`flex h-9 w-full items-center gap-3 rounded-[8px] px-3 py-2 transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 ${
        active
          ? "bg-gray-50 text-green-400 active:bg-gray-100"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-800 active:bg-gray-100"
      }`}
    >
      <SidebarIcon name={section.icon} />
      <span
        className={`min-w-0 flex-1 truncate ${
          active
            ? "text-h-16-semibold"
            : "text-h-16-medium"
        }`}
      >
        {section.label}
      </span>
      {sectionBadge ? (
        <Badge
          variant={sectionBadge.tone === "ai" ? "green" : "greenSolid"}
          size={sectionBadge.tone === "ai" ? "M" : "count"}
          shape={sectionBadge.tone === "ai" ? "default" : "pill"}
          className={sectionBadge.tone === "ai" ? "text-green-300" : undefined}
        >
          {sectionBadge.label}
        </Badge>
      ) : null}
    </Link>
  );
}

function getSectionBadge(
  section: AdminSection,
  counts: AdminShellBadgeCounts,
) {
  if (section.badge && section.badgeTone === "ai") {
    return { label: section.badge, tone: "ai" as const };
  }

  if (section.key === "workers") {
    return createCountBadge(counts.workerApplications);
  }

  if (section.key === "schedule") {
    return createCountBadge(counts.scheduleApprovals);
  }

  if (section.key === "records") {
    return createCountBadge(counts.recordPendingItems);
  }

  return null;
}

function SidebarIcon({ name }: { name: AdminIconName }) {
  return (
    <span
      aria-hidden="true"
      className="size-4 shrink-0 bg-current"
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
  breadcrumbs,
  inviteCode,
  isInviteCodeLoading,
}: {
  breadcrumbs: HeaderBreadcrumb[];
  inviteCode: string | null;
  isInviteCodeLoading: boolean;
}) {
  const [inviteCodeCopyStatus, setInviteCodeCopyStatus] = useState<{
    code: string | null;
    result: "idle" | "copied" | "failed";
  }>({ code: null, result: "idle" });
  const canCopyInviteCode = Boolean(inviteCode) && !isInviteCodeLoading;
  const currentInviteCodeCopyResult =
    inviteCodeCopyStatus.code === inviteCode
      ? inviteCodeCopyStatus.result
      : "idle";

  useEffect(() => {
    if (currentInviteCodeCopyResult === "idle") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setInviteCodeCopyStatus({ code: null, result: "idle" });
    }, 1600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentInviteCodeCopyResult]);

  async function handleInviteCodeCopy() {
    if (!inviteCode || isInviteCodeLoading) {
      return;
    }

    const copied = await copyTextToClipboard(inviteCode);
    setInviteCodeCopyStatus({
      code: inviteCode,
      result: copied ? "copied" : "failed",
    });
  }

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between gap-4 border-b border-gray-200 bg-white px-4">
      <HeaderBreadcrumbs breadcrumbs={breadcrumbs} />
      <div className="flex shrink-0 items-center gap-4">
        <button
          type="button"
          aria-disabled={canCopyInviteCode ? undefined : true}
          className={`flex h-9 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 text-h-16-medium text-gray-700 shadow-[0px_1px_2px_rgba(17,24,39,0.03)] transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 ${
            canCopyInviteCode
              ? "hover:border-gray-300 hover:bg-gray-50"
              : "cursor-not-allowed opacity-60"
          }`}
          data-copy-state={currentInviteCodeCopyResult}
          data-testid="admin-header-invite-code-copy"
          disabled={!canCopyInviteCode}
          onClick={() => {
            void handleInviteCodeCopy();
          }}
        >
          <span
            aria-hidden="true"
            className="flex size-4 shrink-0 items-center justify-center"
          >
            {currentInviteCodeCopyResult === "copied" ? (
              <Check className="size-4 text-green-400" strokeWidth={2.6} />
            ) : currentInviteCodeCopyResult === "failed" ? (
              <X className="size-4 text-red-500" strokeWidth={2.6} />
            ) : (
              <Copy className="size-4" strokeWidth={2.2} />
            )}
          </span>
          <span>참여 코드 복사</span>
        </button>
        <span
          aria-live="polite"
          className="sr-only"
          data-testid="admin-header-invite-code-copy-status"
        >
          {currentInviteCodeCopyResult === "copied"
            ? "참여 코드가 복사되었습니다."
            : currentInviteCodeCopyResult === "failed"
              ? "참여 코드 복사에 실패했습니다."
              : ""}
        </span>
        <HeaderNotificationSlot />
      </div>
    </header>
  );
}

function HeaderBreadcrumbs({
  breadcrumbs,
}: {
  breadcrumbs: HeaderBreadcrumb[];
}) {
  return (
    <nav
      aria-label="현재 위치"
      className="min-w-0 flex-1"
      data-testid="admin-header-breadcrumbs"
    >
      <ol className="flex min-w-0 items-center gap-1 text-h-16-medium text-gray-500">
        {breadcrumbs.map((breadcrumb, index) => {
          const current = index === breadcrumbs.length - 1;

          return (
            <li
              key={`${breadcrumb.href}-${breadcrumb.label}-${index}`}
              className="flex min-w-0 items-center gap-1"
            >
              {index > 0 ? (
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-gray-300"
                  strokeWidth={2}
                />
              ) : null}
              {current ? (
                <h1
                  aria-current="page"
                  className="truncate text-h-18-semibold text-gray-900"
                >
                  {breadcrumb.label}
                </h1>
              ) : (
                <Link
                  href={breadcrumb.href}
                  className="block truncate rounded-[6px] px-1 py-1 transition-colors duration-150 ease-out hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
                >
                  {breadcrumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

async function copyTextToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the textarea fallback below.
    }
  }

  if (typeof document === "undefined") {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.left = "-9999px";
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  document.body.append(textarea);
  textarea.focus();
  textarea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

function SectionTabs({
  badgeCounts,
  pathname,
  tabs,
}: {
  badgeCounts: AdminShellBadgeCounts;
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
    <div className="sticky top-0 z-30 bg-gray-100 px-4 pt-3">
      <nav
        ref={listRef}
        className="group/section-tabs relative isolate flex h-9 items-end overflow-hidden border-b border-gray-200"
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
          const badge = tab.badge ?? getTabBadge(tab, badgeCounts);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              {...{ [slidingTabValueAttribute]: tab.href }}
              className={`relative z-10 flex h-9 items-start border-b-2 px-3 text-h-16-semibold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 ${
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

function getTabBadge(tab: AdminTab, counts: AdminShellBadgeCounts) {
  if (tab.href === "/workers/applications") {
    return createCountBadge(counts.workerApplications)?.label;
  }

  if (tab.href === "/schedule") {
    return createCountBadge(counts.scheduleApprovals)?.label;
  }

  if (tab.href === "/records") {
    return createCountBadge(counts.recordPendingItems)?.label;
  }

  return undefined;
}

function createCountBadge(count: number) {
  return count > 0 ? { label: String(count), tone: "count" as const } : null;
}

function findActiveTabHref(pathname: string, tabs: AdminTab[]) {
  return [...tabs]
    .sort((left, right) => right.href.length - left.href.length)
    .find(
      (tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`),
    )?.href;
}

function findActiveTab(pathname: string, tabs: AdminTab[]) {
  const activeTabHref = findActiveTabHref(pathname, tabs);

  return tabs.find((tab) => tab.href === activeTabHref);
}

function createHeaderBreadcrumbs(
  pathname: string,
  currentSection: AdminSection,
): HeaderBreadcrumb[] {
  const activeTab = findActiveTab(pathname, currentSection.tabs);
  const sectionBreadcrumb: HeaderBreadcrumb = {
    href: currentSection.href,
    label: currentSection.label,
  };
  const activeTabBreadcrumbs: HeaderBreadcrumb[] = activeTab
    ? [
        {
          href: activeTab.href,
          label: activeTab.label,
        },
      ]
    : [];

  return [
    sectionBreadcrumb,
    ...activeTabBreadcrumbs,
    ...createDetailBreadcrumbs(pathname),
  ];
}

function createDetailBreadcrumbs(pathname: string): HeaderBreadcrumb[] {
  const workerDetailMatch = /^\/workers\/([^/]+)(?:\/([^/]+))?$/.exec(pathname);

  if (workerDetailMatch && isWorkerDetailPath(pathname)) {
    const [, workerId, segment] = workerDetailMatch;
    const workerDetailHref = `/workers/${workerId}`;
    const workerDetailTab = getWorkerDetailTabBreadcrumb(
      segment,
      workerDetailHref,
    );

    return [
      { href: workerDetailHref, label: "조교 상세" },
      workerDetailTab,
    ];
  }

  if (/^\/schedule\/duties\/[^/]+$/.test(pathname)) {
    return [{ href: pathname, label: "근무 상세" }];
  }

  return [];
}

function getWorkerDetailTabBreadcrumb(
  segment: string | undefined,
  workerDetailHref: string,
): HeaderBreadcrumb {
  if (segment === "schedule") {
    return { href: `${workerDetailHref}/schedule`, label: "시간표" };
  }

  if (segment === "payroll") {
    return { href: `${workerDetailHref}/payroll`, label: "급여 현황" };
  }

  return { href: workerDetailHref, label: "기본 정보" };
}
