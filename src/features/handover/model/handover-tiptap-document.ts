import type { JSONContent } from "@tiptap/core";
import type { HandoverEditorNode } from "./handover-editor";

export const handoverProposalNodeName = "handoverProposal";

type ProposalAttrs = {
  after?: readonly string[];
  before?: readonly string[];
  proposalId?: string;
};

export function markdownToTiptapDocument(content: string): JSONContent {
  return {
    content: markdownLinesToTiptapNodes(splitMarkdownLines(content)),
    type: "doc",
  };
}

export function handoverEditorNodesToTiptapDocument(
  nodes: readonly HandoverEditorNode[],
): JSONContent {
  return {
    content: nodes.flatMap((node) => {
      if (node.type === "proposal") {
        return {
          attrs: {
            after: [...node.after],
            before: [...node.before],
            proposalId: node.id,
          },
          type: handoverProposalNodeName,
        };
      }

      return markdownLinesToTiptapNodes([node.markdown]);
    }),
    type: "doc",
  };
}

export function markdownLinesToTiptapNodes(
  lines: readonly string[],
): JSONContent[] {
  if (!lines.length) {
    return [createParagraphNode("")];
  }

  let nodes: JSONContent[] = [];
  let pendingListItems: string[] = [];

  const flushList = () => {
    if (!pendingListItems.length) {
      return;
    }

    nodes = [
      ...nodes,
      {
        content: pendingListItems.map((item) => ({
          content: [createParagraphNode(item)],
          type: "listItem",
        })),
        type: "bulletList",
      },
    ];
    pendingListItems = [];
  };

  for (const line of lines) {
    const listMatch = /^[-*]\s+(.*)$/.exec(line);

    if (listMatch) {
      pendingListItems = [...pendingListItems, listMatch[1]];
      continue;
    }

    flushList();
    nodes = [...nodes, markdownLineToTiptapNode(line)];
  }

  flushList();

  return nodes.length ? nodes : [createParagraphNode("")];
}

export function tiptapDocumentToMarkdown(document: JSONContent): string {
  return (document.content ?? [])
    .flatMap((node) => tiptapNodeToMarkdownLines(node))
    .join("\n")
    .trimEnd();
}

export function tiptapDocumentHasProposal(document: JSONContent) {
  return (document.content ?? []).some(
    (node) => node.type === handoverProposalNodeName,
  );
}

export function getTiptapDocumentActiveFormat(
  editor: {
    isActive: (name: string, attrs?: Record<string, unknown>) => boolean;
  } | null,
) {
  if (!editor) {
    return null;
  }

  if (editor.isActive("heading", { level: 1 })) {
    return "heading1";
  }

  if (editor.isActive("heading", { level: 2 })) {
    return "heading2";
  }

  if (editor.isActive("heading", { level: 3 })) {
    return "heading3";
  }

  if (editor.isActive("bulletList") || editor.isActive("listItem")) {
    return "listItem";
  }

  if (editor.isActive("horizontalRule")) {
    return "divider";
  }

  return "paragraph";
}

function splitMarkdownLines(content: string) {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  if (!normalized.length) {
    return [];
  }

  return normalized.split("\n");
}

function markdownLineToTiptapNode(line: string): JSONContent {
  const headingMatch = /^(#{1,3})\s*(.*)$/.exec(line);

  if (headingMatch) {
    return {
      attrs: { level: headingMatch[1].length },
      content: createTextContent(headingMatch[2]),
      type: "heading",
    };
  }

  if (line.trim() === "---" || line.trim() === "***") {
    return { type: "horizontalRule" };
  }

  return createParagraphNode(line);
}

function createParagraphNode(text: string): JSONContent {
  return {
    content: createTextContent(text),
    type: "paragraph",
  };
}

function createTextContent(text: string): JSONContent[] | undefined {
  return text ? [{ text, type: "text" }] : undefined;
}

function tiptapNodeToMarkdownLines(node: JSONContent): string[] {
  if (node.type === handoverProposalNodeName) {
    const attrs = (node.attrs ?? {}) as ProposalAttrs;

    return [...(attrs.before ?? [])];
  }

  if (node.type === "heading") {
    const level = Math.min(
      Math.max(Number(node.attrs?.level ?? 1), 1),
      3,
    );

    return [`${"#".repeat(level)} ${getNodeText(node)}`.trimEnd()];
  }

  if (node.type === "horizontalRule") {
    return ["---"];
  }

  if (node.type === "bulletList") {
    return (node.content ?? [])
      .filter((child) => child.type === "listItem")
      .map((child) => `- ${getNodeText(child)}`.trimEnd());
  }

  if (node.type === "paragraph") {
    return [getNodeText(node)];
  }

  return [getNodeText(node)];
}

function getNodeText(node: JSONContent): string {
  if (node.type === "text") {
    return node.text ?? "";
  }

  if (node.type === "hardBreak") {
    return "\n";
  }

  return (node.content ?? []).map((child) => getNodeText(child)).join("");
}
