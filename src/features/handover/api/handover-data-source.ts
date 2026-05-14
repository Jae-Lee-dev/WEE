import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { resolveActiveWorkspaceId } from "@/entities/workspace";
import { readActiveWorkspaceId } from "@/entities/workspace";
import {
  getFirebaseAuth,
  getFirebaseDb,
  isMockFirebaseProject,
} from "@/shared/api/firebase/client";
import {
  handoverFixture,
  type HandoverDocumentBlock,
  type HandoverFixture,
} from "../model/handover-fixtures";

export type HandoverDataSource = {
  generateHandoverDraft: (
    input: GenerateHandoverDraftInput,
  ) => Promise<GenerateHandoverDraftResult>;
  getHandover: () => Promise<HandoverFixture>;
  mode: "fixture" | "firestore";
  publishHandover: (input: PublishHandoverInput) => Promise<HandoverFixture>;
};

export type GenerateHandoverDraftInput = {
  content: string;
  instruction: string;
};

export type GenerateHandoverDraftResult = {
  message: string;
  nextContent: string;
};

export type PublishHandoverInput = {
  content: string;
  notifyWorkers: boolean;
};

export function createHandoverDataSource(): HandoverDataSource {
  if (shouldUseVisualMockDataSource()) {
    return createMockHandoverDataSource();
  }

  return createFirestoreHandoverDataSource();
}

function createMockHandoverDataSource(): HandoverDataSource {
  let content = serializeBlocks(handoverFixture.document.blocks);

  return {
    mode: "fixture",
    async generateHandoverDraft(input) {
      return createMockAiDraft(input);
    },
    async getHandover() {
      return createFixtureFromContent(content);
    },
    async publishHandover(input) {
      content = input.content;

      return createFixtureFromContent(content);
    },
  };
}

function createFirestoreHandoverDataSource(): HandoverDataSource {
  return {
    mode: "firestore",
    async generateHandoverDraft(input) {
      const response = await fetch("/api/handover/ai-edit", {
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          readString(
            typeof data === "object" && data !== null
              ? (data as { error?: unknown }).error
              : null,
            "AI 수정안을 생성하지 못했습니다.",
          ),
        );
      }

      return {
        message: readString(
          typeof data === "object" && data !== null
            ? (data as { message?: unknown }).message
            : null,
          "수정안을 만들었습니다. 문서에서 변경사항을 확인해 주세요.",
        ),
        nextContent: readString(
          typeof data === "object" && data !== null
            ? (data as { nextContent?: unknown }).nextContent
            : null,
          input.content,
        ),
      };
    },
    async getHandover() {
      const workspaceId = await requireActiveWorkspaceId();
      const snapshot = await getDocs(
        query(
          collection(getFirebaseDb(), "workspaces", workspaceId, "handoverDocuments"),
          orderBy("publishedAt", "desc"),
          limit(1),
        ),
      );
      const document = snapshot.docs[0]?.data();
      const publishedContent = readString(document?.publishedContent, "");
      const blocks = parseMarkdownBlocks(publishedContent);

      return {
        ...handoverFixture,
        document: {
          title: getDocumentTitle(blocks),
          blocks,
          publishedContent,
        },
      };
    },
    async publishHandover(input) {
      const workspaceId = await requireActiveWorkspaceId();
      const content = input.content.trim();

      await setDoc(
        doc(getFirebaseDb(), "workspaces", workspaceId, "handoverDocuments", "handover_current"),
        {
          createdBy: getFirebaseAuth().currentUser?.uid ?? null,
          notifyWorkers: input.notifyWorkers,
          publishedAt: serverTimestamp(),
          publishedContent: content,
          status: "published",
          updatedAt: serverTimestamp(),
          workspaceId,
        },
        { merge: true },
      );

      return createFixtureFromContent(content);
    },
  };
}

async function requireActiveWorkspaceId() {
  const workspaceId = await resolveActiveWorkspaceId();

  if (!workspaceId) {
    throw new Error("활성 소속을 확인할 수 없습니다.");
  }

  return workspaceId;
}

function shouldUseVisualMockDataSource() {
  return isMockFirebaseProject() || readActiveWorkspaceId() === "workspace_visual";
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function parseMarkdownBlocks(content: string): HandoverDocumentBlock[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
  let blocks: HandoverDocumentBlock[] = [];
  let listItems: string[] = [];

  const appendBlock = (block: HandoverDocumentBlock) => {
    blocks = [...blocks, block];
  };

  const flushList = () => {
    if (!listItems.length) {
      return;
    }

    appendBlock({
      id: `list-${blocks.length}`,
      items: listItems.map((item, index) => ({
        id: `list-${blocks.length}-${index}`,
        segments: [{ text: item }],
      })),
      spacing: "sm",
      type: "list",
    });
    listItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "---" || trimmed === "***") {
      flushList();
      appendBlock({ id: `divider-${blocks.length}`, type: "divider" });
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      flushList();
      appendBlock({
        id: `heading-${blocks.length}`,
        level: headingMatch[1].length as 1 | 2 | 3,
        spacing: blocks.length === 0 ? "none" : "md",
        text: headingMatch[2],
        type: "heading",
      });
      continue;
    }

    const listMatch = /^[-*]\s+(.+)$/.exec(trimmed);
    if (listMatch) {
      listItems = [...listItems, listMatch[1]];
      continue;
    }

    flushList();
    appendBlock({
      id: `paragraph-${blocks.length}`,
      lines: [trimmed],
      spacing: blocks.length === 0 ? "none" : "sm",
      type: "paragraph",
    });
  }

  flushList();

  if (!blocks.length) {
    return [
      {
        id: "empty-handover",
        level: 1,
        spacing: "none",
        text: "게시된 인수인계 문서가 없습니다",
        type: "heading",
      },
    ];
  }

  return blocks;
}

function getDocumentTitle(blocks: readonly HandoverDocumentBlock[]) {
  const heading = blocks.find((block) => block.type === "heading");

  return heading?.type === "heading" ? heading.text : handoverFixture.document.title;
}

function createFixtureFromContent(content: string): HandoverFixture {
  const blocks = parseMarkdownBlocks(content);

  return {
    ...handoverFixture,
    document: {
      title: getDocumentTitle(blocks),
      blocks,
      publishedContent: content,
    },
  };
}

function createMockAiDraft(
  input: GenerateHandoverDraftInput,
): GenerateHandoverDraftResult {
  const content = input.content.trimEnd();
  const addition = input.instruction.includes("보강")
    ? "- 보강 자료 프린트 준비"
    : "- 판서 노트 정리 후 강사실 제출";

  if (content.includes(addition)) {
    return {
      message: "이미 반영된 항목입니다. 문서에서 변경사항을 확인해 주세요.",
      nextContent: content,
    };
  }

  const cautionHeading = "### 유의사항";
  const cautionIndex = content.indexOf(cautionHeading);

  if (cautionIndex >= 0) {
    const before = content.slice(0, cautionIndex + cautionHeading.length);
    const after = content.slice(cautionIndex + cautionHeading.length);

    return {
      message: "수학 A반 질문 조교 수정안을 만들었습니다. 문서에서 변경사항을 확인해 주세요.",
      nextContent: `${before}\n- 자습 시간 중 휴대폰 사용 금지\n- 학부모 문의는 담당 강사에게 연결 후 강사실 메모 남기기\n${addition}${after.replace(
        /^\n(?:- 자습 시간 중 휴대폰 사용 금지\n)?(?:- 학부모 문의는 담당 강사에게 연결\n)?/,
        "\n",
      )}`.trimEnd(),
    };
  }

  return {
    message: "수정안을 만들었습니다. 문서에서 변경사항을 확인해 주세요.",
    nextContent: `${content}\n${addition}`.trimEnd(),
  };
}

function serializeBlocks(blocks: readonly HandoverDocumentBlock[]) {
  return blocks
    .flatMap((block) => {
      if (block.type === "heading") {
        return `${"#".repeat(block.level)} ${block.text}`;
      }

      if (block.type === "paragraph") {
        return block.lines;
      }

      if (block.type === "list") {
        return block.items.map((item) =>
          `- ${item.segments.map((segment) => segment.text).join("")}`,
        );
      }

      if (block.type === "divider") {
        return "---";
      }

      return [
        ...block.suggestion.unchanged.map((line) => `- ${line}`),
        ...block.suggestion.inserted.map((line) => `- ${line}`),
      ];
    })
    .join("\n");
}
