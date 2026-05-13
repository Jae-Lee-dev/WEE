export type HeaderNotificationTone = "green" | "blue" | "orange" | "red";

export type HeaderNotificationItem = {
  id: string;
  label: string;
  tone: HeaderNotificationTone;
  title: string;
  date: string;
  href: string;
};

export const headerNotifications = [
  {
    id: "notification-anomaly",
    label: "이상 플래그",
    tone: "red",
    title: "김서연 · 위치 이상 · 수학 A반",
    date: "04.15",
    href: "/records?type=anomaly",
  },
  {
    id: "notification-correction",
    label: "이의 신청",
    tone: "orange",
    title: "김서연 · 4/15 근무기록 수정 이의신청",
    date: "04.15",
    href: "/records?type=correction",
  },
  {
    id: "notification-overtime",
    label: "추가 근무",
    tone: "blue",
    title: "이하은 · 시험대비 보강 신청",
    date: "04.15",
    href: "/records?type=overtime",
  },
  {
    id: "notification-schedule",
    label: "시간표",
    tone: "green",
    title: "강태우 · 시간표 최초 제출",
    date: "04.14",
    href: "/schedule",
  },
] as const satisfies readonly HeaderNotificationItem[];
