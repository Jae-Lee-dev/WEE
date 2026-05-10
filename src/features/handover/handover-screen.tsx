import { IconChevronDown } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  handoverFixture,
  type HandoverBlockSpacing,
  type HandoverChatMessage,
  type HandoverDocumentBlock,
  type HandoverInlineSegment,
  type HandoverSuggestion,
} from "./handover-fixtures";

const blockSpacingClassName: Record<HandoverBlockSpacing, string> = {
  none: "mt-0",
  xs: "mt-2",
  sm: "mt-4",
  md: "mt-5",
  lg: "mt-7",
};

export function HandoverScreen() {
  return (
    <section
      aria-label="인수인계 문서 편집"
      className="mx-auto grid h-[calc(100vh-202px)] w-full max-w-[1580px] grid-cols-[minmax(0,1fr)_minmax(360px,440px)] gap-5 overflow-hidden tracking-normal"
      data-testid="handover-screen"
    >
      <div className="flex min-h-0 min-w-0 flex-col gap-5 overflow-hidden">
        <HandoverToolbar />
        <HandoverEditor />
      </div>
      <HandoverChatPanel />
    </section>
  );
}

function HandoverToolbar() {
  const { toolbar } = handoverFixture;

  return (
    <div className="flex h-20 shrink-0 items-center gap-3 rounded-[8px] bg-white px-5">
      <button
        type="button"
        className="flex h-[42px] items-center gap-2 rounded-[6px] border border-gray-200 bg-white px-2.5 text-h-18-regular tracking-normal text-gray-800 shadow-[0px_1px_2px_rgba(17,24,39,0.03)] transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
      >
        <span>{toolbar.styleLabel}</span>
        <IconChevronDown className="size-5 shrink-0 text-gray-700" />
      </button>
      <button
        type="button"
        aria-label="굵게"
        className="flex h-[42px] min-w-[45px] items-center justify-center rounded-[6px] border border-gray-200 bg-white px-3 text-h-18-semibold tracking-normal text-gray-800 shadow-[0px_1px_2px_rgba(17,24,39,0.03)] transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
      >
        {toolbar.boldLabel}
      </button>
      <button
        type="button"
        className="flex h-[42px] items-center justify-center rounded-[6px] border border-gray-200 bg-white px-3 text-h-18-regular tracking-normal text-gray-800 shadow-[0px_1px_2px_rgba(17,24,39,0.03)] transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
      >
        {toolbar.dividerLabel}
      </button>
      <button
        type="button"
        className="flex h-[42px] items-center justify-center rounded-[6px] border border-gray-200 bg-white px-3 text-h-18-regular tracking-normal text-gray-800 shadow-[0px_1px_2px_rgba(17,24,39,0.03)] transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
      >
        {toolbar.codeLabel}
      </button>
    </div>
  );
}

function HandoverEditor() {
  return (
    <article
      aria-label="인수인계 문서 본문"
      className="min-h-0 flex-1 overflow-hidden rounded-[8px] bg-white"
      data-testid="handover-editor"
    >
      <div className="px-5 py-[21px] text-gray-900">
        {handoverFixture.document.blocks.map((block) => (
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
        "relative min-h-[196px] rounded-[8px] border border-green-400 bg-green-50 px-4 pb-[72px] pt-4 text-h-18-regular",
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
          className="h-[49px] rounded-[8px] px-6 text-h-18-semibold tracking-normal"
        >
          {suggestion.cancelLabel}
        </Button>
        <Button
          type="button"
          className="h-[49px] rounded-[8px] px-6 text-h-18-semibold tracking-normal"
        >
          {suggestion.applyLabel}
        </Button>
      </div>
    </div>
  );
}

function HandoverChatPanel() {
  const { chat } = handoverFixture;

  return (
    <aside
      aria-label="AI 채팅 편집"
      className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[8px] border border-gray-200 bg-white"
      data-testid="handover-chat-panel"
    >
      <header className="flex h-[70px] shrink-0 items-center gap-3 px-5">
        <h2 className="text-h-20 text-gray-900">{chat.title}</h2>
        <Badge
          variant="green"
          size="M"
          className="bg-green-100 px-2 py-0.5 text-body-14-regular tracking-normal text-green-300"
        >
          {chat.planBadge}
        </Badge>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden px-5 pt-0">
        {chat.messages.map((message) => (
          <HandoverChatMessageBubble key={message.id} message={message} />
        ))}
      </div>
      <div className="flex h-20 shrink-0 items-center gap-3 border-t border-gray-200 px-5">
        <input
          readOnly
          aria-label="수정할 내용"
          placeholder={chat.inputPlaceholder}
          className="h-[50px] min-w-0 flex-1 rounded-[8px] border border-gray-200 bg-gray-50 px-4 text-h-18-regular tracking-normal text-gray-900 outline-none placeholder:text-gray-400"
        />
        <Button
          type="button"
          className="h-[50px] rounded-[12px] px-4 text-h-18-semibold tracking-normal"
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
