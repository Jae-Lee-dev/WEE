export type HandoverEditableNode = {
  id: string;
  kind: "blank" | "divider" | "heading" | "listItem" | "paragraph";
  level?: 1 | 2 | 3;
  markdown: string;
  type: "editable";
};

export type HandoverProposalNode = {
  after: readonly string[];
  before: readonly string[];
  id: string;
  type: "proposal";
};

export type HandoverEditorNode = HandoverEditableNode | HandoverProposalNode;

type DiffOperation =
  | { line: string; type: "equal" }
  | { line: string; type: "insert" }
  | { line: string; type: "delete" };

export function parseMarkdownToEditorNodes(
  content: string,
): readonly HandoverEditorNode[] {
  const lines = splitMarkdownLines(content);

  if (!lines.length) {
    return [createEditableNode("", 0)];
  }

  return lines.map((line, index) => createEditableNode(line, index));
}

export function serializeEditorNodes(
  nodes: readonly HandoverEditorNode[],
): string {
  return nodes
    .flatMap((node) => {
      if (node.type === "proposal") {
        return node.before;
      }

      return node.markdown;
    })
    .join("\n")
    .trimEnd();
}

export function createNodesWithProposalDiff({
  baseContent,
  nextContent,
}: {
  baseContent: string;
  nextContent: string;
}): readonly HandoverEditorNode[] {
  const baseLines = splitMarkdownLines(baseContent);
  const nextLines = splitMarkdownLines(nextContent);
  const operations = diffLines(baseLines, nextLines);
  let nodes: HandoverEditorNode[] = [];
  let pendingBefore: string[] = [];
  let pendingAfter: string[] = [];

  const flushProposal = () => {
    if (!pendingBefore.length && !pendingAfter.length) {
      return;
    }

    nodes = [
      ...nodes,
      {
        after: pendingAfter,
        before: pendingBefore,
        id: `proposal-${nodes.length}`,
        type: "proposal",
      },
    ];
    pendingBefore = [];
    pendingAfter = [];
  };

  for (const operation of operations) {
    if (operation.type === "equal") {
      flushProposal();
      nodes = [...nodes, createEditableNode(operation.line, nodes.length)];
      continue;
    }

    if (operation.type === "delete") {
      pendingBefore = [...pendingBefore, operation.line];
    } else {
      pendingAfter = [...pendingAfter, operation.line];
    }
  }

  flushProposal();

  if (!nodes.length) {
    return [createEditableNode("", 0)];
  }

  return nodes;
}

export function hasPendingProposal(nodes: readonly HandoverEditorNode[]) {
  return nodes.some((node) => node.type === "proposal");
}

export function updateEditableNode(
  nodes: readonly HandoverEditorNode[],
  nodeId: string,
  displayText: string,
): readonly HandoverEditorNode[] {
  return nodes.map((node) => {
    if (node.type !== "editable" || node.id !== nodeId) {
      return node;
    }

    return {
      ...node,
      markdown: createMarkdownFromDisplayText(node, displayText),
    };
  });
}

export function appendEditableSnippet(
  nodes: readonly HandoverEditorNode[],
  snippet: string,
): readonly HandoverEditorNode[] {
  const nextLines = splitMarkdownLines(snippet);
  const nextNodes = nextLines.map((line, index) =>
    createEditableNode(line, nodes.length + index),
  );

  return [...nodes, ...nextNodes];
}

export function resolveProposalNode({
  accept,
  nodes,
  proposalId,
}: {
  accept: boolean;
  nodes: readonly HandoverEditorNode[];
  proposalId: string;
}): readonly HandoverEditorNode[] {
  return nodes.flatMap((node, index) => {
    if (node.type !== "proposal" || node.id !== proposalId) {
      return [node];
    }

    const lines = accept ? node.after : node.before;

    if (!lines.length) {
      return [];
    }

    return lines.map((line, lineIndex) =>
      createEditableNode(line, index + lineIndex),
    );
  });
}

export function getEditableDisplayText(node: HandoverEditableNode) {
  if (node.kind === "heading") {
    return node.markdown.replace(/^#{1,3}\s*/, "");
  }

  if (node.kind === "listItem") {
    return node.markdown.replace(/^[-*]\s*/, "");
  }

  if (node.kind === "divider") {
    return "";
  }

  return node.markdown;
}

export function getLineDisplayText(markdown: string) {
  const node = createEditableNode(markdown, 0);

  return getEditableDisplayText(node);
}

function splitMarkdownLines(content: string) {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  if (!normalized.length) {
    return [];
  }

  return normalized.split("\n");
}

function createEditableNode(line: string, index: number): HandoverEditableNode {
  const headingMatch = /^(#{1,3})\s*(.*)$/.exec(line);

  if (headingMatch) {
    return {
      id: `line-${index}`,
      kind: "heading",
      level: headingMatch[1].length as 1 | 2 | 3,
      markdown: line,
      type: "editable",
    };
  }

  if (/^[-*]\s+/.test(line)) {
    return {
      id: `line-${index}`,
      kind: "listItem",
      markdown: line,
      type: "editable",
    };
  }

  if (line.trim() === "---" || line.trim() === "***") {
    return {
      id: `line-${index}`,
      kind: "divider",
      markdown: "---",
      type: "editable",
    };
  }

  if (!line.trim()) {
    return {
      id: `line-${index}`,
      kind: "blank",
      markdown: "",
      type: "editable",
    };
  }

  return {
    id: `line-${index}`,
    kind: "paragraph",
    markdown: line,
    type: "editable",
  };
}

function createMarkdownFromDisplayText(
  node: HandoverEditableNode,
  displayText: string,
) {
  if (node.kind === "heading") {
    return `${"#".repeat(node.level ?? 1)} ${displayText}`.trimEnd();
  }

  if (node.kind === "listItem") {
    return displayText.trim() ? `- ${displayText}` : "- ";
  }

  if (node.kind === "divider") {
    return "---";
  }

  return displayText;
}

function diffLines(
  before: readonly string[],
  after: readonly string[],
): readonly DiffOperation[] {
  const table = Array.from({ length: before.length + 1 }, () =>
    Array.from({ length: after.length + 1 }, () => 0),
  );

  for (let beforeIndex = before.length - 1; beforeIndex >= 0; beforeIndex -= 1) {
    for (let afterIndex = after.length - 1; afterIndex >= 0; afterIndex -= 1) {
      table[beforeIndex][afterIndex] =
        before[beforeIndex] === after[afterIndex]
          ? table[beforeIndex + 1][afterIndex + 1] + 1
          : Math.max(
              table[beforeIndex + 1][afterIndex],
              table[beforeIndex][afterIndex + 1],
            );
    }
  }

  let operations: DiffOperation[] = [];
  let beforeIndex = 0;
  let afterIndex = 0;

  while (beforeIndex < before.length && afterIndex < after.length) {
    if (before[beforeIndex] === after[afterIndex]) {
      operations = [
        ...operations,
        { line: before[beforeIndex], type: "equal" },
      ];
      beforeIndex += 1;
      afterIndex += 1;
      continue;
    }

    if (table[beforeIndex + 1][afterIndex] >= table[beforeIndex][afterIndex + 1]) {
      operations = [
        ...operations,
        { line: before[beforeIndex], type: "delete" },
      ];
      beforeIndex += 1;
    } else {
      operations = [
        ...operations,
        { line: after[afterIndex], type: "insert" },
      ];
      afterIndex += 1;
    }
  }

  while (beforeIndex < before.length) {
    operations = [
      ...operations,
      { line: before[beforeIndex], type: "delete" },
    ];
    beforeIndex += 1;
  }

  while (afterIndex < after.length) {
    operations = [
      ...operations,
      { line: after[afterIndex], type: "insert" },
    ];
    afterIndex += 1;
  }

  return operations;
}
