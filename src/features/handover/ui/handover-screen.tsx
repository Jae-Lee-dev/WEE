"use client";

import { useEffect, useMemo, useState } from "react";
import { IconChevronDown } from "@/shared/ui/icons";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { createHandoverDataSource } from "../api/handover-data-source";
import {
  handoverFixture,
  type HandoverBlockSpacing,
  type HandoverChatMessage,
  type HandoverDocumentBlock,
  type HandoverFixture,
  type HandoverInlineSegment,
  type HandoverSuggestion,
} from "../model/handover-fixtures";

const blockSpacingClassName: Record<HandoverBlockSpacing, string> = {
  none: "mt-0",
  xs: "mt-2",
  sm: "mt-4",
  md: "mt-5",
  lg: "mt-7",
};

export function HandoverScreen() {
  const dataSource = useMemo(() => createHandoverDataSource(), []);
  const [fixture, setFixture] = useState<HandoverFixture>(handoverFixture);
  const [draftContent, setDraftContent] = useState("");
  const [publishedContent, setPublishedContent] = useState("");
  const [chatMessages, setChatMessages] = useState<readonly HandoverChatMessage[]>(
    handoverFixture.chat.messages,
  );
  const [chatInput, setChatInput] = useState("");
  const [loading, setLoading] = useState(dataSource.mode !== "fixture");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const draftFixture = useMemo(
    () => createDraftFixture(fixture, draftContent, chatMessages),
    [chatMessages, draftContent, fixture],
  );
  const dirty = draftContent.trim() !== publishedContent.trim();

  useEffect(() => {
    let cancelled = false;

    dataSource
      .getHandover()
      .then((nextFixture) => {
        if (!cancelled) {
          setFixture(nextFixture);
          setDraftContent(getPublishedContent(nextFixture));
          setPublishedContent(getPublishedContent(nextFixture));
          setChatMessages(nextFixture.chat.messages);
          setErrorMessage("");
          setLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "인수인계 문서를 불러오지 못했습니다.",
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dataSource]);

  return (
    <section
      aria-label="인수인계 문서 편집"
      className="mx-auto grid h-[calc(100vh-144px)] w-full max-w-[1480px] grid-cols-[minmax(0,1fr)_minmax(320px,380px)] gap-4 overflow-hidden tracking-normal"
      data-testid="handover-screen"
    >
      {loading || errorMessage ? (
        <HandoverState
          label={
            errorMessage || "게시된 인수인계 문서를 불러오는 중입니다."
          }
          role={errorMessage ? "alert" : "status"}
        />
      ) : (
        <>
          <div className="flex min-h-0 min-w-0 flex-col gap-4 overflow-hidden">
            <HandoverToolbar
              dirty={dirty}
              fixture={draftFixture}
              saving={saving}
              onFormat={(snippet) =>
                setDraftContent((current) =>
                  current.trim() ? `${current.trimEnd()}\n${snippet}` : snippet,
                )
              }
              onPublish={() => setPublishDialogOpen(true)}
            />
            {statusMessage || errorMessage ? (
              <div
                className={cn(
                  "rounded-[8px] border px-4 py-2.5 text-body-14-medium",
                  statusMessage
                    ? "border-green-100 bg-green-50 text-green-500"
                    : "border-red-100 bg-red-50 text-red-500",
                )}
                role={statusMessage ? "status" : "alert"}
              >
                {statusMessage || errorMessage}
              </div>
            ) : null}
            <HandoverEditor
              fixture={draftFixture}
              onChangeContent={setDraftContent}
            />
          </div>
          <HandoverChatPanel
            fixture={draftFixture}
            inputValue={chatInput}
            onChangeInput={setChatInput}
            onSend={() => {
              const instruction = chatInput.trim();

              if (!instruction) {
                return;
              }

              setDraftContent((current) =>
                `${current.trimEnd()}\n- ${instruction}`.trim(),
              );
              setChatMessages((current) =>
                appendChatExchange(current, instruction),
              );
              setChatInput("");
            }}
          />
          {statusMessage ? (
            <div className="sr-only" role="status">
              {statusMessage}
            </div>
          ) : null}
          {publishDialogOpen ? (
            <PublishDialog
              saving={saving}
              onClose={() => setPublishDialogOpen(false)}
              onPublish={(notifyWorkers) => {
                setSaving(true);
                setErrorMessage("");
                setStatusMessage("");

                void dataSource
                  .publishHandover({
                    content: draftContent,
                    notifyWorkers,
                  })
                  .then((nextFixture) => {
                    const nextContent = getPublishedContent(nextFixture);

                    setFixture(nextFixture);
                    setDraftContent(nextContent);
                    setPublishedContent(nextContent);
                    setPublishDialogOpen(false);
                    setStatusMessage("인수인계 문서를 게시했습니다.");
                  })
                  .catch(() => {
                    setErrorMessage("인수인계 문서를 게시하지 못했습니다.");
                  })
                  .finally(() => setSaving(false));
              }}
            />
          ) : null}
        </>
      )}
    </section>
  );
}

function HandoverState({
  label,
  role,
}: {
  label: string;
  role: "alert" | "status";
}) {
  return (
    <div
      className="col-span-2 flex min-h-[360px] items-center justify-center rounded-[8px] bg-white px-4 text-center text-h-18-regular tracking-normal text-gray-500"
      role={role}
    >
      {label}
    </div>
  );
}

function HandoverToolbar({
  dirty,
  fixture,
  onFormat,
  onPublish,
  saving,
}: {
  dirty: boolean;
  fixture: HandoverFixture;
  onFormat: (snippet: string) => void;
  onPublish: () => void;
  saving: boolean;
}) {
  const { toolbar } = fixture;

  return (
    <div className="flex h-14 shrink-0 items-center gap-3 rounded-[8px] bg-white px-4">
      <button
        type="button"
        onClick={() => onFormat("## 새 제목")}
        className="flex h-9 items-center gap-2 rounded-[6px] border border-gray-200 bg-white px-2.5 text-h-18-regular tracking-normal text-gray-800 shadow-[0px_1px_2px_rgba(17,24,39,0.03)] transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
      >
        <span>{toolbar.styleLabel}</span>
        <IconChevronDown className="size-5 shrink-0 text-gray-700" />
      </button>
      <button
        type="button"
        aria-label="굵게"
        onClick={() => onFormat("**굵게 표시할 내용**")}
        className="flex h-9 min-w-[45px] items-center justify-center rounded-[6px] border border-gray-200 bg-white px-3 text-h-18-semibold tracking-normal text-gray-800 shadow-[0px_1px_2px_rgba(17,24,39,0.03)] transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
      >
        {toolbar.boldLabel}
      </button>
      <button
        type="button"
        onClick={() => onFormat("---")}
        className="flex h-9 items-center justify-center rounded-[6px] border border-gray-200 bg-white px-3 text-h-18-regular tracking-normal text-gray-800 shadow-[0px_1px_2px_rgba(17,24,39,0.03)] transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
      >
        {toolbar.dividerLabel}
      </button>
      <button
        type="button"
        onClick={() => onFormat("`코드`")}
        className="flex h-9 items-center justify-center rounded-[6px] border border-gray-200 bg-white px-3 text-h-18-regular tracking-normal text-gray-800 shadow-[0px_1px_2px_rgba(17,24,39,0.03)] transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
      >
        {toolbar.codeLabel}
      </button>
      <Button
        type="button"
        disabled={!dirty || saving}
        onClick={onPublish}
        className="ml-auto h-9 rounded-full px-4 text-h-16-semibold"
      >
        {saving ? "게시 중" : "게시"}
      </Button>
    </div>
  );
}

function HandoverEditor({
  fixture,
  onChangeContent,
}: {
  fixture: HandoverFixture;
  onChangeContent: (content: string) => void;
}) {
  return (
    <article
      aria-label="인수인계 문서 본문"
      contentEditable
      suppressContentEditableWarning
      onInput={(event) =>
        onChangeContent(event.currentTarget.innerText.trimEnd())
      }
      className="min-h-0 flex-1 overflow-hidden rounded-[8px] bg-white"
      data-testid="handover-editor"
    >
      <div className="px-4 py-[21px] text-gray-900">
        {fixture.document.blocks.map((block) => (
          <HandoverDocumentBlockView key={block.id} block={block} />
        ))}
      </div>
    </article>
  );
}

function HandoverDocumentBlockView({
  block,
}: {
  block: HandoverDocumentBlock;
}) {
  if (block.type === "divider") {
    return <div className="my-5 h-px bg-gray-200" />;
  }

  const spacing = blockSpacingClassName[block.spacing ?? "md"];

  if (block.type === "heading") {
    const headingClassName = cn(
      spacing,
      block.level === 1 && "text-h-20 text-gray-900",
      block.level === 2 && "text-h-20 text-gray-900",
      block.level === 3 && "text-h-18-semibold text-gray-900",
    );

    if (block.level === 1) {
      return <h2 className={headingClassName}>{block.text}</h2>;
    }

    if (block.level === 2) {
      return <h3 className={headingClassName}>{block.text}</h3>;
    }

    return <h4 className={headingClassName}>{block.text}</h4>;
  }

  if (block.type === "paragraph") {
    return (
      <p className={cn(spacing, "text-h-18-regular text-gray-800")}>
        {block.lines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </p>
    );
  }

  if (block.type === "list") {
    return (
      <ul className={cn(spacing, "space-y-0.5 text-h-18-regular text-gray-900")}>
        {block.items.map((item) => (
          <li key={item.id} className="flex gap-1.5">
            <span aria-hidden="true">-</span>
            <span>
              <InlineSegments segments={item.segments} />
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <HandoverSuggestionBlock
      className={spacing}
      suggestion={block.suggestion}
    />
  );
}

function InlineSegments({
  segments,
}: {
  segments: readonly HandoverInlineSegment[];
}) {
  return segments.map((segment, index) =>
    segment.strong ? (
      <strong key={`${segment.text}-${index}`} className="font-semibold">
        {segment.text}
      </strong>
    ) : (
      <span key={`${segment.text}-${index}`}>{segment.text}</span>
    ),
  );
}

function HandoverSuggestionBlock({
  suggestion,
  className,
}: {
  suggestion: HandoverSuggestion;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative min-h-[160px] rounded-[8px] border border-green-400 bg-green-50 px-4 pb-14 pt-4 text-h-18-regular",
        className,
      )}
      data-testid="handover-selected-suggestion"
    >
      <div className="space-y-0.5">
        {suggestion.unchanged.map((line) => (
          <div key={line} className="text-gray-900">
            - {line}
          </div>
        ))}
        {suggestion.removed.map((line) => (
          <div key={line} className="text-red-500 line-through">
            - {line}
          </div>
        ))}
        {suggestion.inserted.map((line) => (
          <div key={line} className="text-green-400">
            - {line}
          </div>
        ))}
      </div>
      <div className="absolute bottom-4 right-4 flex gap-3">
        <Button
          type="button"
          variant="secondary"
          className="h-11 rounded-[8px] px-6 text-h-18-semibold tracking-normal"
        >
          {suggestion.cancelLabel}
        </Button>
        <Button
          type="button"
          className="h-11 rounded-[8px] px-6 text-h-18-semibold tracking-normal"
        >
          {suggestion.applyLabel}
        </Button>
      </div>
    </div>
  );
}

function HandoverChatPanel({
  fixture,
  inputValue,
  onChangeInput,
  onSend,
}: {
  fixture: HandoverFixture;
  inputValue: string;
  onChangeInput: (value: string) => void;
  onSend: () => void;
}) {
  const { chat } = fixture;

  return (
    <aside
      aria-label="AI 채팅 편집"
      className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[8px] border border-gray-200 bg-white"
      data-testid="handover-chat-panel"
    >
      <header className="flex h-[56px] shrink-0 items-center gap-3 px-4">
        <h2 className="text-h-20 text-gray-900">{chat.title}</h2>
        <Badge
          variant="green"
          size="M"
          className="bg-green-100 px-2 py-0.5 text-body-14-regular tracking-normal text-green-300"
        >
          {chat.planBadge}
        </Badge>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden px-4 pt-0">
        {chat.messages.map((message) => (
          <HandoverChatMessageBubble key={message.id} message={message} />
        ))}
      </div>
      <div className="flex h-14 shrink-0 items-center gap-3 border-t border-gray-200 px-4">
        <input
          aria-label="수정할 내용"
          value={inputValue}
          onChange={(event) => onChangeInput(event.target.value)}
          placeholder={chat.inputPlaceholder}
          className="h-11 min-w-0 flex-1 rounded-[8px] border border-gray-200 bg-gray-50 px-4 text-h-18-regular tracking-normal text-gray-900 outline-none placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-green-200"
        />
        <Button
          type="button"
          onClick={onSend}
          className="h-11 rounded-[12px] px-4 text-h-18-semibold tracking-normal"
        >
          {chat.sendLabel}
        </Button>
      </div>
    </aside>
  );
}

function HandoverChatMessageBubble({
  message,
}: {
  message: HandoverChatMessage;
}) {
  const assistant = message.role === "assistant";

  return (
    <div
      className={cn(
        "w-[360px] max-w-full rounded-[8px] px-4 py-3 text-h-18-regular tracking-normal",
        assistant
          ? "self-start bg-green-400 text-white"
          : "self-end bg-gray-100 text-gray-800",
      )}
    >
      {message.text}
    </div>
  );
}

function PublishDialog({
  onClose,
  onPublish,
  saving,
}: {
  onClose: () => void;
  onPublish: (notifyWorkers: boolean) => void;
  saving: boolean;
}) {
  const [notifyWorkers, setNotifyWorkers] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="handover-publish-title"
        className="flex w-[calc(100vw-32px)] max-w-[520px] flex-col rounded-[8px] bg-white p-8 shadow-[0px_16px_44px_rgba(17,24,39,0.18)]"
      >
        <h2 id="handover-publish-title" className="text-h-20 text-gray-900">
          인수인계 문서 게시
        </h2>
        <p className="mt-3 text-h-18-regular text-gray-600">
          현재 초안을 게시된 문서로 저장합니다.
        </p>
        <label className="mt-6 flex items-center gap-3 text-h-18-regular text-gray-900">
          <input
            type="checkbox"
            checked={notifyWorkers}
            onChange={(event) => setNotifyWorkers(event.target.checked)}
            className="size-5 accent-green-400"
          />
          조교에게 게시 알림 발송
        </label>
        <div className="mt-7 flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={onClose}
            className="h-11 rounded-[8px] px-6"
          >
            취소
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => onPublish(notifyWorkers)}
            className="h-11 rounded-[8px] px-6"
          >
            {saving ? "게시 중" : "게시 확정"}
          </Button>
        </div>
      </section>
    </div>
  );
}

function getPublishedContent(fixture: HandoverFixture) {
  return (
    fixture.document.publishedContent ??
    serializeBlocks(fixture.document.blocks)
  );
}

function createDraftFixture(
  fixture: HandoverFixture,
  content: string,
  messages: readonly HandoverChatMessage[],
): HandoverFixture {
  const blocks = parseMarkdownBlocks(content);

  return {
    ...fixture,
    chat: {
      ...fixture.chat,
      messages,
    },
    document: {
      ...fixture.document,
      blocks,
      title: getDocumentTitle(blocks),
    },
  };
}

function appendChatExchange(
  current: readonly HandoverChatMessage[],
  instruction: string,
) {
  const createdAt = Date.now();

  return current.concat([
    {
      id: `handover-user-${createdAt}`,
      role: "user",
      text: instruction,
    },
    {
      id: `handover-assistant-${createdAt}`,
      role: "assistant",
      text: "요청 내용을 문서 초안 하단에 반영했습니다.",
    },
  ]);
}

function parseMarkdownBlocks(content: string): HandoverDocumentBlock[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
  let blocks: HandoverDocumentBlock[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (!listItems.length) {
      return;
    }

    const blockIndex = blocks.length;

    blocks = blocks.concat({
      id: `draft-list-${blockIndex}`,
      items: listItems.map((item, index) => ({
        id: `draft-list-${blockIndex}-${index}`,
        segments: [{ text: item }],
      })),
      spacing: "sm",
      type: "list",
    });
    listItems = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed === "---") {
      flushList();
      blocks = blocks.concat({
        id: `draft-divider-${blocks.length}`,
        type: "divider",
      });
      return;
    }

    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed);

    if (headingMatch) {
      flushList();
      blocks = blocks.concat({
        id: `draft-heading-${blocks.length}`,
        level: headingMatch[1].length as 1 | 2 | 3,
        spacing: blocks.length === 0 ? "none" : "md",
        text: headingMatch[2],
        type: "heading",
      });
      return;
    }

    const listMatch = /^[-*]\s+(.+)$/.exec(trimmed);

    if (listMatch) {
      listItems = listItems.concat(listMatch[1]);
      return;
    }

    flushList();
    blocks = blocks.concat({
      id: `draft-paragraph-${blocks.length}`,
      lines: [trimmed],
      spacing: blocks.length === 0 ? "none" : "sm",
      type: "paragraph",
    });
  });

  flushList();

  return blocks.length
    ? blocks
    : [
        {
          id: "draft-empty",
          level: 1,
          spacing: "none",
          text: "게시된 인수인계 문서가 없습니다",
          type: "heading",
        },
      ];
}

function getDocumentTitle(blocks: readonly HandoverDocumentBlock[]) {
  const heading = blocks.find((block) => block.type === "heading");

  return heading?.type === "heading" ? heading.text : "업무 공통 안내";
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
