import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { resolveActiveWorkspaceId } from "@/features/entry/workspace-data-source";
import { readActiveWorkspaceId } from "@/features/entry/workspace-onboarding-state";
import { getFirebaseDb, isMockFirebaseProject } from "@/lib/firebase/client";
import {
  handoverFixture,
  type HandoverDocumentBlock,
  type HandoverFixture,
} from "./handover-fixtures";

export type HandoverDataSource = {
  getHandover: () => Promise<HandoverFixture>;
};

export function createHandoverDataSource(): HandoverDataSource {
  if (shouldUseVisualMockDataSource()) {
    return createMockHandoverDataSource();
  }

  return createFirestoreHandoverDataSource();
}

function createMockHandoverDataSource(): HandoverDataSource {
  return {
    async getHandover() {
      return handoverFixture;
    },
  };
}

function createFirestoreHandoverDataSource(): HandoverDataSource {
  return {
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
        },
      };
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
