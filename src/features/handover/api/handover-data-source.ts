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
  getHandover: () => Promise<HandoverFixture>;
  mode: "fixture" | "firestore";
  publishHandover: (input: PublishHandoverInput) => Promise<HandoverFixture>;
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
