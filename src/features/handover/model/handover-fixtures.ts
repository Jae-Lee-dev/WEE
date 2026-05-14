export type HandoverInlineSegment = {
  text: string;
  strong?: boolean;
};

export type HandoverBlockSpacing = "none" | "xs" | "sm" | "md" | "lg";

export type HandoverSuggestion = {
  id: string;
  unchanged: readonly string[];
  removed: readonly string[];
  inserted: readonly string[];
  cancelLabel: string;
  applyLabel: string;
};

export type HandoverDocumentBlock =
  | {
      id: string;
      type: "heading";
      level: 1 | 2 | 3;
      text: string;
      spacing?: HandoverBlockSpacing;
    }
  | {
      id: string;
      type: "paragraph";
      lines: readonly string[];
      spacing?: HandoverBlockSpacing;
    }
  | {
      id: string;
      type: "list";
      items: readonly {
        id: string;
        segments: readonly HandoverInlineSegment[];
      }[];
      spacing?: HandoverBlockSpacing;
    }
  | {
      id: string;
      type: "divider";
    }
  | {
      id: string;
      type: "suggestion";
      suggestion: HandoverSuggestion;
      spacing?: HandoverBlockSpacing;
    };

export type HandoverChatMessage = {
  attachments?: readonly HandoverChatMessageAttachment[];
  id: string;
  role: "assistant" | "user";
  text: string;
};

export type HandoverChatMessageAttachment = {
  name: string;
  size: number;
};

export type HandoverFixture = {
  route: string;
  toolbar: {
    styleLabel: string;
    boldLabel: string;
    dividerLabel: string;
    codeLabel: string;
  };
  document: {
    title: string;
    blocks: readonly HandoverDocumentBlock[];
    publishedContent?: string;
  };
};

const selectedSuggestion = {
  id: "math-a-question-assistant-suggestion",
  unchanged: ["자습 시간 중 휴대폰 사용 금지"],
  removed: ["학부모 문의는 담당 강사에게 연결"],
  inserted: [
    "학부모 문의는 담당 강사에게 연결 후 강사실 메모 남기기",
    "판서 노트 정리 후 강사실 제출",
  ],
  cancelLabel: "취소",
  applyLabel: "반영",
} as const satisfies HandoverSuggestion;

export const handoverFixture = {
  route: "/handover",
  toolbar: {
    styleLabel: "제목 1",
    boldLabel: "B",
    dividerLabel: "- 구분선",
    codeLabel: "`코드`",
  },
  document: {
    title: "업무 공통 안내",
    blocks: [
      {
        id: "document-title",
        type: "heading",
        level: 1,
        text: "업무 공통 안내",
        spacing: "none",
      },
      {
        id: "before-shift",
        type: "heading",
        level: 2,
        text: "근무 시작 전",
        spacing: "md",
      },
      {
        id: "before-shift-copy",
        type: "paragraph",
        lines: [
          "반드시 앱에서 출근 처리를 완료해주세요.",
          "퇴근 시에도 동일하게 퇴근 처리를 해주세요.",
        ],
        spacing: "sm",
      },
      {
        id: "intro-divider",
        type: "divider",
      },
      {
        id: "math-a-question-assistant",
        type: "heading",
        level: 2,
        text: "수학A반 질문 조교",
        spacing: "none",
      },
      {
        id: "basic-role",
        type: "heading",
        level: 3,
        text: "기본 역할",
        spacing: "md",
      },
      {
        id: "basic-role-list",
        type: "list",
        items: [
          {
            id: "arrival",
            segments: [
              { text: "수업 시작 " },
              { text: "30분", strong: true },
              { text: " 전 강의실 도착 및 준비" },
            ],
          },
          {
            id: "question",
            segments: [
              { text: "학생 질문 답변 시 " },
              { text: "교재 p.xx", strong: true },
              { text: " 참조 후 응대" },
            ],
          },
          {
            id: "attendance-report",
            segments: [
              { text: "출석 체크 완료 후 담당 강사에게 보고" },
            ],
          },
        ],
        spacing: "sm",
      },
      {
        id: "cautions",
        type: "heading",
        level: 3,
        text: "유의사항",
        spacing: "lg",
      },
      {
        id: "selected-ai-suggestion",
        type: "suggestion",
        suggestion: selectedSuggestion,
        spacing: "sm",
      },
      {
        id: "admin-divider",
        type: "divider",
      },
      {
        id: "lab-admin",
        type: "heading",
        level: 2,
        text: "연구실 행정",
        spacing: "none",
      },
      {
        id: "weekly-work",
        type: "heading",
        level: 3,
        text: "주간업무",
        spacing: "md",
      },
      {
        id: "weekly-work-list",
        type: "list",
        items: [
          {
            id: "weekly-classroom-ready",
            segments: [
              { text: "수업 시작 " },
              { text: "30분", strong: true },
              { text: " 전 강의실 도착 및 준비" },
            ],
          },
          {
            id: "weekly-supplies",
            segments: [
              { text: "주간 소모품 재고 확인 후 담당자에게 공유" },
            ],
          },
        ],
        spacing: "sm",
      },
    ],
  },
} as const satisfies HandoverFixture;
