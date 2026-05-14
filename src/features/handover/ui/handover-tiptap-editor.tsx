"use client";

import {
  Extension,
  mergeAttributes,
  Node,
  type Editor,
  type JSONContent,
} from "@tiptap/core";
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  type ReactNodeViewProps,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";
import { Button } from "@/shared/ui/button";
import {
  getTiptapDocumentActiveFormat,
  handoverProposalNodeName,
  markdownLinesToTiptapNodes,
  tiptapDocumentHasProposal,
  tiptapDocumentToMarkdown,
} from "../model/handover-tiptap-document";
import type { HandoverBlockFormat } from "../model/handover-editor";

type HandoverTiptapEditorProps = {
  content: JSONContent;
  contentVersion: number;
  locked: boolean;
  onActiveFormatChange: (format: HandoverBlockFormat | null) => void;
  onContentChange: (payload: {
    content: string;
    document: JSONContent;
    pendingProposal: boolean;
  }) => void;
  onEditorReady: (editor: Editor | null) => void;
};

const handoverTiptapExtensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
    horizontalRule: {
      HTMLAttributes: {
        "data-testid": "handover-divider-block",
      },
    },
  }),
  Extension.create({
    name: "handoverHorizontalRuleBackspace",
    priority: 1000,

    addKeyboardShortcuts() {
      return {
        Backspace: () => {
          const { state, view } = this.editor;
          const { selection } = state;

          if (!selection.empty) {
            return false;
          }

          const { $from } = selection;
          const isEmptyParagraph =
            $from.depth >= 1 &&
            $from.parent.type.name === "paragraph" &&
            $from.parent.content.size === 0 &&
            $from.parentOffset === 0;

          if (!isEmptyParagraph) {
            return false;
          }

          const blockStart = $from.before($from.depth);
          const previousNode = state.doc.resolve(blockStart).nodeBefore;

          if (previousNode?.type.name !== "horizontalRule") {
            return false;
          }

          view.dispatch(
            state.tr.delete(blockStart - previousNode.nodeSize, blockStart),
          );

          return true;
        },
      };
    },
  }),
  Node.create({
    name: handoverProposalNodeName,
    group: "block",
    atom: true,
    selectable: true,
    isolating: true,

    addAttributes() {
      return {
        after: {
          default: [],
        },
        before: {
          default: [],
        },
        proposalId: {
          default: "",
        },
      };
    },

    parseHTML() {
      return [{ tag: `[data-type="${handoverProposalNodeName}"]` }];
    },

    renderHTML({ HTMLAttributes }) {
      return [
        "div",
        mergeAttributes(HTMLAttributes, {
          "data-type": handoverProposalNodeName,
        }),
      ];
    },

    addNodeView() {
      return ReactNodeViewRenderer(HandoverProposalNodeView);
    },
  }),
];

export function HandoverTiptapEditor({
  content,
  contentVersion,
  locked,
  onActiveFormatChange,
  onContentChange,
  onEditorReady,
}: HandoverTiptapEditorProps) {
  const appliedContentVersion = useRef(-1);
  const editor = useEditor({
    content,
    editable: !locked,
    editorProps: {
      attributes: {
        "aria-label": "인수인계 문서 본문",
        class: "handover-tiptap-prosemirror",
      },
    },
    extensions: handoverTiptapExtensions,
    immediatelyRender: false,
    onCreate: ({ editor: nextEditor }) => {
      emitEditorState(nextEditor, onContentChange, onActiveFormatChange);
      onEditorReady(nextEditor);
    },
    onSelectionUpdate: ({ editor: nextEditor }) => {
      onActiveFormatChange(getTiptapDocumentActiveFormat(nextEditor));
    },
    onUpdate: ({ editor: nextEditor }) => {
      emitEditorState(nextEditor, onContentChange, onActiveFormatChange);
    },
  });

  useEffect(() => {
    onEditorReady(editor);

    return () => {
      onEditorReady(null);
    };
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(!locked);
  }, [editor, locked]);

  useEffect(() => {
    if (!editor || appliedContentVersion.current === contentVersion) {
      return;
    }

    appliedContentVersion.current = contentVersion;
    editor.commands.setContent(content, { emitUpdate: false });
    emitEditorState(editor, onContentChange, onActiveFormatChange);
  }, [content, contentVersion, editor, onActiveFormatChange, onContentChange]);

  return (
    <article
      aria-busy={locked}
      aria-label="인수인계 문서 본문"
      className="min-h-0 flex-1 overflow-auto rounded-[8px] bg-white px-6 py-6"
      data-testid="handover-editor"
    >
      <EditorContent editor={editor} />
    </article>
  );
}

function emitEditorState(
  editor: Editor,
  onContentChange: HandoverTiptapEditorProps["onContentChange"],
  onActiveFormatChange: HandoverTiptapEditorProps["onActiveFormatChange"],
) {
  const document = editor.getJSON();

  onContentChange({
    content: tiptapDocumentToMarkdown(document),
    document,
    pendingProposal: tiptapDocumentHasProposal(document),
  });
  onActiveFormatChange(getTiptapDocumentActiveFormat(editor));
}

function HandoverProposalNodeView(props: ReactNodeViewProps) {
  const attrs = props.node.attrs as {
    after?: unknown;
    before?: unknown;
    proposalId?: unknown;
  };
  const before = toStringArray(attrs.before);
  const after = toStringArray(attrs.after);

  function resolveProposal(accept: boolean) {
    const lines = accept ? after : before;
    const replacementContent = markdownLinesToTiptapNodes(lines);

    props.editor
      .chain()
      .focus()
      .command(({ state, tr }) => {
        const position =
          typeof props.getPos === "function" ? props.getPos() : undefined;

        if (typeof position !== "number") {
          return false;
        }

        const replacementNodes = replacementContent.map((node) =>
          state.schema.nodeFromJSON(node),
        );

        tr.replaceWith(
          position,
          position + props.node.nodeSize,
          replacementNodes,
        );

        return true;
      })
      .run();
  }

  return (
    <NodeViewWrapper
      as="div"
      className="my-3 flex flex-col gap-4 rounded-[8px] border border-green-400 bg-green-50 p-4 text-h-18-regular tracking-normal"
      contentEditable={false}
      data-testid="handover-proposal-block"
    >
      <div className="space-y-0.5">
        {before.map((line, index) => (
          <div
            key={`before-${index}-${line}`}
            className="text-red-500 line-through"
            data-testid="handover-proposal-removed-line"
          >
            {formatProposalLine(line)}
          </div>
        ))}
        {after.map((line, index) => (
          <div
            key={`after-${index}-${line}`}
            className="font-semibold text-green-400"
            data-testid="handover-proposal-inserted-line"
          >
            {formatProposalLine(line)}
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => resolveProposal(false)}
          className="h-11 rounded-[8px] px-6 text-h-18-semibold tracking-normal"
        >
          취소
        </Button>
        <Button
          type="button"
          onClick={() => resolveProposal(true)}
          className="h-11 rounded-[8px] px-6 text-h-18-semibold tracking-normal"
        >
          반영
        </Button>
      </div>
    </NodeViewWrapper>
  );
}

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function formatProposalLine(markdown: string) {
  const displayText = markdown
    .replace(/^#{1,3}\s*/, "")
    .replace(/^[-*]\s*/, "");

  if (!displayText) {
    return "(빈 줄)";
  }

  if (/^[-*]\s+/.test(markdown)) {
    return `- ${displayText}`;
  }

  return displayText;
}
