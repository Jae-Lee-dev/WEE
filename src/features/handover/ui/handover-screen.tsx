"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { IconChevronDown } from "@/shared/ui/icons";
import { cn } from "@/shared/lib/utils";
import { createHandoverDataSource } from "../api/handover-data-source";
import {
  appendEditableSnippet,
  createNodesWithProposalDiff,
  getEditableDisplayText,
  getLineDisplayText,
  hasPendingProposal,
  parseMarkdownToEditorNodes,
  resolveProposalNode,
  serializeEditorNodes,
  updateEditableNode,
  type HandoverEditableNode,
  type HandoverEditorNode,
  type HandoverProposalNode,
} from "../model/handover-editor";
import {
  handoverFixture,
  type HandoverChatMessage,
  type HandoverFixture,
} from "../model/handover-fixtures";

type PendingNavigationTarget = {
  href: string;
  internalPath?: string;
};

const handoverChatCopy = {
  disabledPlaceholder: "수정안을 먼저 검토해 주세요.",
  inputPlaceholder: "수정 요청을 입력하세요...",
  sendLabel: "전송",
  title: "AI 수정 요청",
} as const;

export function HandoverScreen() {
  const router = useRouter();
  const dataSource = useMemo(() => createHandoverDataSource(), []);
  const [fixture, setFixture] = useState<HandoverFixture>(handoverFixture);
  const [editorNodes, setEditorNodes] = useState<readonly HandoverEditorNode[]>(
    () => parseMarkdownToEditorNodes(""),
  );
  const [publishedContent, setPublishedContent] = useState("");
  const [chatMessages, setChatMessages] = useState<readonly HandoverChatMessage[]>(
    [],
  );
  const [chatInput, setChatInput] = useState("");
  const [loading, setLoading] = useState(dataSource.mode !== "fixture");
  const [aiSaving, setAiSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] =
    useState<PendingNavigationTarget | null>(null);
  const currentContent = useMemo(
    () => serializeEditorNodes(editorNodes),
    [editorNodes],
  );
  const pendingProposal = hasPendingProposal(editorNodes);
  const dirty = currentContent.trim() !== publishedContent.trim();
  const editorLocked = aiSaving || loading;
  const navigationGuardEnabled =
    !loading && (dirty || pendingProposal || aiSaving);

  useHandoverUnsavedNavigationGuard({
    enabled: navigationGuardEnabled,
    onNavigateRequest: setPendingNavigation,
  });

  useEffect(() => {
    let cancelled = false;

    dataSource
      .getHandover()
      .then((nextFixture) => {
        if (!cancelled) {
          const nextContent = getPublishedContent(nextFixture);

          setFixture(nextFixture);
          setEditorNodes(parseMarkdownToEditorNodes(nextContent));
          setPublishedContent(nextContent);
          setChatMessages([]);
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

  function sendAiInstruction() {
    const instruction = chatInput.trim();

    if (!instruction || aiSaving || pendingProposal) {
      return;
    }

    const baseContent = serializeEditorNodes(editorNodes);

    setAiSaving(true);
    setErrorMessage("");
    setStatusMessage("AI가 수정안을 생성하는 중입니다.");
    setChatInput("");
    setChatMessages((current) => appendUserMessage(current, instruction));

    void dataSource
      .generateHandoverDraft({ content: baseContent, instruction })
      .then((result) => {
        setEditorNodes(
          createNodesWithProposalDiff({
            baseContent,
            nextContent: result.nextContent,
          }),
        );
        setChatMessages((current) =>
          appendAssistantMessage(current, result.message),
        );
        setStatusMessage("AI 수정안을 문서에 표시했습니다.");
      })
      .catch((error: unknown) => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "AI 수정안을 생성하지 못했습니다.",
        );
        setStatusMessage("");
      })
      .finally(() => setAiSaving(false));
  }

  return (
    <section
      aria-label="인수인계 문서 편집"
      className="mx-auto grid h-[calc(100vh-144px)] w-full max-w-[1480px] grid-cols-[minmax(0,1fr)_minmax(320px,380px)] gap-4 overflow-hidden tracking-normal"
      data-testid="handover-screen"
    >
      {loading || (errorMessage && !editorNodes.length) ? (
        <HandoverState
          label={errorMessage || "게시된 인수인계 문서를 불러오는 중입니다."}
          role={errorMessage ? "alert" : "status"}
        />
      ) : (
        <>
          <div className="flex min-h-0 min-w-0 flex-col gap-4 overflow-hidden">
            <HandoverToolbar
              dirty={dirty}
              disabled={editorLocked}
              fixture={fixture}
              pendingProposal={pendingProposal}
              publishing={publishing}
              onFormat={(snippet) =>
                setEditorNodes((current) =>
                  appendEditableSnippet(current, snippet),
                )
              }
              onPublish={() => setPublishDialogOpen(true)}
            />
            {statusMessage || errorMessage || pendingProposal ? (
              <HandoverInlineNotice
                errorMessage={errorMessage}
                pendingProposal={pendingProposal}
                statusMessage={statusMessage}
              />
            ) : null}
            <HandoverEditor
              locked={editorLocked}
              nodes={editorNodes}
              onCancelProposal={(proposalId) =>
                setEditorNodes((current) =>
                  resolveProposalNode({
                    accept: false,
                    nodes: current,
                    proposalId,
                  }),
                )
              }
              onChangeNode={(nodeId, value) =>
                setEditorNodes((current) =>
                  updateEditableNode(current, nodeId, value),
                )
              }
              onConfirmProposal={(proposalId) =>
                setEditorNodes((current) =>
                  resolveProposalNode({
                    accept: true,
                    nodes: current,
                    proposalId,
                  }),
                )
              }
            />
          </div>
          <HandoverChatPanel
            disabled={aiSaving || pendingProposal}
            inputValue={chatInput}
            messages={chatMessages}
            onChangeInput={setChatInput}
            onSend={sendAiInstruction}
          />
          {publishDialogOpen ? (
            <PublishDialog
              currentContent={currentContent}
              publishedContent={publishedContent}
              publishing={publishing}
              onClose={() => setPublishDialogOpen(false)}
              onPublish={(notifyWorkers) => {
                setPublishing(true);
                setErrorMessage("");
                setStatusMessage("");

                void dataSource
                  .publishHandover({
                    content: currentContent,
                    notifyWorkers,
                  })
                  .then((nextFixture) => {
                    const nextContent = getPublishedContent(nextFixture);

                    setFixture(nextFixture);
                    setEditorNodes(parseMarkdownToEditorNodes(nextContent));
                    setPublishedContent(nextContent);
                    setPublishDialogOpen(false);
                    setStatusMessage("인수인계 문서를 게시했습니다.");
                  })
                  .catch(() => {
                    setErrorMessage("인수인계 문서를 게시하지 못했습니다.");
                  })
                  .finally(() => setPublishing(false));
              }}
            />
          ) : null}
          {pendingNavigation ? (
            <UnsavedNavigationDialog
              aiSaving={aiSaving}
              pendingProposal={pendingProposal}
              onCancel={() => setPendingNavigation(null)}
              onConfirm={() => {
                const target = pendingNavigation;

                setPendingNavigation(null);

                if (target.internalPath) {
                  router.push(target.internalPath);
                } else {
                  window.location.assign(target.href);
                }
              }}
            />
          ) : null}
        </>
      )}
    </section>
  );
}

function useHandoverUnsavedNavigationGuard({
  enabled,
  onNavigateRequest,
}: {
  enabled: boolean;
  onNavigateRequest: (target: PendingNavigationTarget) => void;
}) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = getAnchorFromEventTarget(event.target);

      if (!anchor || anchor.hasAttribute("download")) {
        return;
      }

      if (anchor.target && anchor.target !== "_self") {
        return;
      }

      const target = getNavigationTarget(anchor);

      if (!target) {
        return;
      }

      event.preventDefault();
      onNavigateRequest(target);
    }

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [enabled, onNavigateRequest]);
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

function HandoverInlineNotice({
  errorMessage,
  pendingProposal,
  statusMessage,
}: {
  errorMessage: string;
  pendingProposal: boolean;
  statusMessage: string;
}) {
  const label =
    errorMessage ||
    (pendingProposal
      ? "AI 수정안을 검토한 뒤 취소 또는 반영을 선택해 주세요."
      : statusMessage);

  return (
    <div
      className={cn(
        "rounded-[8px] border px-4 py-2.5 text-body-14-medium",
        errorMessage
          ? "border-red-100 bg-red-50 text-red-500"
          : "border-green-100 bg-green-50 text-green-500",
      )}
      role={errorMessage ? "alert" : "status"}
    >
      {label}
    </div>
  );
}

function HandoverToolbar({
  dirty,
  disabled,
  fixture,
  onFormat,
  onPublish,
  pendingProposal,
  publishing,
}: {
  dirty: boolean;
  disabled: boolean;
  fixture: HandoverFixture;
  onFormat: (snippet: string) => void;
  onPublish: () => void;
  pendingProposal: boolean;
  publishing: boolean;
}) {
  const { toolbar } = fixture;
  const formatDisabled = disabled || pendingProposal;

  return (
    <div className="flex h-14 shrink-0 items-center gap-3 rounded-[8px] bg-white px-4">
      <button
        type="button"
        disabled={formatDisabled}
        onClick={() => onFormat("## 새 제목")}
        className="flex h-9 items-center gap-2 rounded-[6px] border border-gray-200 bg-white px-2.5 text-h-18-regular tracking-normal text-gray-800 shadow-[0px_1px_2px_rgba(17,24,39,0.03)] transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 disabled:pointer-events-none disabled:opacity-50"
      >
        <span>{toolbar.styleLabel}</span>
        <IconChevronDown className="size-5 shrink-0 text-gray-700" />
      </button>
      <button
        type="button"
        aria-label="굵게"
        disabled={formatDisabled}
        onClick={() => onFormat("**굵게 표시할 내용**")}
        className="flex h-9 min-w-[45px] items-center justify-center rounded-[6px] border border-gray-200 bg-white px-3 text-h-18-semibold tracking-normal text-gray-800 shadow-[0px_1px_2px_rgba(17,24,39,0.03)] transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 disabled:pointer-events-none disabled:opacity-50"
      >
        {toolbar.boldLabel}
      </button>
      <button
        type="button"
        disabled={formatDisabled}
        onClick={() => onFormat("---")}
        className="flex h-9 items-center justify-center rounded-[6px] border border-gray-200 bg-white px-3 text-h-18-regular tracking-normal text-gray-800 shadow-[0px_1px_2px_rgba(17,24,39,0.03)] transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 disabled:pointer-events-none disabled:opacity-50"
      >
        {toolbar.dividerLabel}
      </button>
      <button
        type="button"
        disabled={formatDisabled}
        onClick={() => onFormat("`코드`")}
        className="flex h-9 items-center justify-center rounded-[6px] border border-gray-200 bg-white px-3 text-h-18-regular tracking-normal text-gray-800 shadow-[0px_1px_2px_rgba(17,24,39,0.03)] transition-colors duration-150 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 disabled:pointer-events-none disabled:opacity-50"
      >
        {toolbar.codeLabel}
      </button>
      <Button
        type="button"
        disabled={!dirty || disabled || pendingProposal || publishing}
        onClick={onPublish}
        className="ml-auto h-9 rounded-full px-4 text-h-16-semibold"
      >
        {publishing ? "게시 중" : "게시"}
      </Button>
    </div>
  );
}

function HandoverEditor({
  locked,
  nodes,
  onCancelProposal,
  onChangeNode,
  onConfirmProposal,
}: {
  locked: boolean;
  nodes: readonly HandoverEditorNode[];
  onCancelProposal: (proposalId: string) => void;
  onChangeNode: (nodeId: string, value: string) => void;
  onConfirmProposal: (proposalId: string) => void;
}) {
  return (
    <article
      aria-busy={locked}
      aria-label="인수인계 문서 본문"
      className={cn(
        "min-h-0 flex-1 overflow-auto rounded-[8px] bg-white px-4 py-[21px]",
        locked && "cursor-wait",
      )}
      data-testid="handover-editor"
    >
      <div className="flex min-h-full flex-col text-gray-900">
        {nodes.map((node) =>
          node.type === "proposal" ? (
            <HandoverProposalBlock
              key={node.id}
              node={node}
              onCancel={() => onCancelProposal(node.id)}
              onConfirm={() => onConfirmProposal(node.id)}
            />
          ) : (
            <HandoverEditableLine
              key={node.id}
              disabled={locked}
              node={node}
              onChange={(value) => onChangeNode(node.id, value)}
            />
          ),
        )}
      </div>
    </article>
  );
}

function HandoverEditableLine({
  disabled,
  node,
  onChange,
}: {
  disabled: boolean;
  node: HandoverEditableNode;
  onChange: (value: string) => void;
}) {
  const value = getEditableDisplayText(node);

  if (node.kind === "divider") {
    return <div className="my-5 h-px shrink-0 bg-gray-200" />;
  }

  if (node.kind === "listItem") {
    return (
      <div className="flex items-start gap-1.5 text-h-18-regular text-gray-900">
        <span aria-hidden="true" className="mt-[1px] shrink-0">
          -
        </span>
        <HandoverLineTextarea
          ariaLabel="목록 항목"
          className="text-h-18-regular"
          disabled={disabled}
          value={value}
          onChange={onChange}
        />
      </div>
    );
  }

  if (node.kind === "heading") {
    return (
      <HandoverLineTextarea
        ariaLabel="제목"
        className={cn(
          node.level === 3 ? "text-h-18-semibold" : "text-h-20",
          node.level === 1 ? "mt-0" : "mt-4",
        )}
        disabled={disabled}
        value={value}
        onChange={onChange}
      />
    );
  }

  return (
    <HandoverLineTextarea
      ariaLabel={node.kind === "blank" ? "빈 줄" : "문단"}
      className={cn(
        "text-h-18-regular",
        node.kind === "blank" ? "min-h-[12px]" : "text-gray-800",
      )}
      disabled={disabled}
      value={value}
      onChange={onChange}
    />
  );
}

function HandoverLineTextarea({
  ariaLabel,
  className,
  disabled,
  onChange,
  value,
}: {
  ariaLabel: string;
  className?: string;
  disabled: boolean;
  onChange: (value: string) => void;
  value: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      resizeTextarea(ref.current);
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      aria-label={ariaLabel}
      disabled={disabled}
      rows={1}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onInput={(event) => resizeTextarea(event.currentTarget)}
      className={cn(
        "min-h-[25px] w-full resize-none overflow-hidden rounded-[4px] border border-transparent bg-transparent px-0 py-0 tracking-normal text-gray-900 outline-none transition-colors duration-150 ease-out placeholder:text-gray-400 hover:border-gray-100 focus-visible:border-green-400 focus-visible:bg-green-50 focus-visible:px-1 disabled:cursor-wait disabled:opacity-100",
        className,
      )}
    />
  );
}

function HandoverProposalBlock({
  node,
  onCancel,
  onConfirm,
}: {
  node: HandoverProposalNode;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="my-3 flex flex-col gap-4 rounded-[8px] border border-green-400 bg-green-50 p-4 text-h-18-regular tracking-normal"
      contentEditable={false}
      data-testid="handover-proposal-block"
    >
      <div className="space-y-0.5">
        {node.before.map((line, index) => (
          <div
            key={`before-${index}-${line}`}
            className="text-red-500 line-through"
            data-testid="handover-proposal-removed-line"
          >
            {formatDiffLine(line)}
          </div>
        ))}
        {node.after.map((line, index) => (
          <div
            key={`after-${index}-${line}`}
            className="font-semibold text-green-400"
            data-testid="handover-proposal-inserted-line"
          >
            {formatDiffLine(line)}
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          className="h-11 rounded-[8px] px-6 text-h-18-semibold tracking-normal"
        >
          취소
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          className="h-11 rounded-[8px] px-6 text-h-18-semibold tracking-normal"
        >
          반영
        </Button>
      </div>
    </div>
  );
}

function HandoverChatPanel({
  disabled,
  inputValue,
  messages,
  onChangeInput,
  onSend,
}: {
  disabled: boolean;
  inputValue: string;
  messages: readonly HandoverChatMessage[];
  onChangeInput: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <aside
      aria-label={handoverChatCopy.title}
      className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[8px] border border-gray-200 bg-white"
      data-testid="handover-chat-panel"
    >
      <header className="flex h-[56px] shrink-0 items-center px-4">
        <h2 className="text-h-20 text-gray-900">{handoverChatCopy.title}</h2>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-4 pt-0">
        {messages.map((message) => (
          <HandoverChatMessageBubble key={message.id} message={message} />
        ))}
      </div>
      <div className="flex h-14 shrink-0 items-center gap-3 border-t border-gray-200 px-4">
        <Input
          aria-label="수정할 내용"
          disabled={disabled}
          value={inputValue}
          onChange={(event) => onChangeInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing) {
              onSend();
            }
          }}
          placeholder={
            disabled
              ? handoverChatCopy.disabledPlaceholder
              : handoverChatCopy.inputPlaceholder
          }
          className="h-11 min-w-0 flex-1 rounded-[8px] border-gray-200 bg-gray-50 text-h-18-regular tracking-normal text-gray-900"
        />
        <Button
          type="button"
          disabled={disabled || !inputValue.trim()}
          onClick={onSend}
          className="h-11 rounded-[12px] px-4 text-h-18-semibold tracking-normal"
        >
          {handoverChatCopy.sendLabel}
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
  currentContent,
  onClose,
  onPublish,
  publishedContent,
  publishing,
}: {
  currentContent: string;
  onClose: () => void;
  onPublish: (notifyWorkers: boolean) => void;
  publishedContent: string;
  publishing: boolean;
}) {
  const [notifyWorkers, setNotifyWorkers] = useState(false);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex w-[calc(100vw-32px)] max-w-[640px] flex-col rounded-[8px] bg-white p-8 text-gray-900 shadow-[0px_16px_44px_rgba(17,24,39,0.18)] ring-0"
      >
        <DialogHeader className="gap-3">
          <DialogTitle className="text-h-20 text-gray-900">
            인수인계 문서 게시
          </DialogTitle>
          <DialogDescription className="text-h-18-regular text-gray-600">
            게시 전 변경된 줄을 확인합니다.
          </DialogDescription>
        </DialogHeader>
        <PublishDiffPreview
          currentContent={currentContent}
          publishedContent={publishedContent}
        />
        <label className="mt-6 flex items-center gap-3 text-h-18-regular text-gray-900">
          <Checkbox
            checked={notifyWorkers}
            onCheckedChange={(value) => setNotifyWorkers(value === true)}
            className="size-5"
          />
          조교에게 게시 알림 발송
        </label>
        <DialogFooter className="-mx-0 -mb-0 mt-7 flex-row justify-end gap-3 rounded-none border-0 bg-transparent p-0">
          <Button
            type="button"
            variant="secondary"
            disabled={publishing}
            onClick={onClose}
            className="h-11 rounded-[8px] px-6"
          >
            취소
          </Button>
          <Button
            type="button"
            disabled={publishing}
            onClick={() => onPublish(notifyWorkers)}
            className="h-11 rounded-[8px] px-6"
          >
            {publishing ? "게시 중" : "게시 확정"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UnsavedNavigationDialog({
  aiSaving,
  onCancel,
  onConfirm,
  pendingProposal,
}: {
  aiSaving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  pendingProposal: boolean;
}) {
  const description = aiSaving
    ? "AI가 수정안을 생성하는 중입니다. 화면을 나가면 현재 요청과 편집 중인 내용이 저장되지 않습니다."
    : pendingProposal
      ? "검토하지 않은 AI 수정안이 있습니다. 화면을 나가면 현재 수정안과 편집 중인 내용이 저장되지 않습니다."
      : "게시하지 않은 수정사항이 있습니다. 화면을 나가면 현재 편집 내용이 저장되지 않습니다.";

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        data-testid="handover-unsaved-navigation-dialog"
        showCloseButton={false}
        className="flex w-[calc(100vw-32px)] max-w-[480px] flex-col rounded-[8px] bg-white p-8 text-gray-900 shadow-[0px_16px_44px_rgba(17,24,39,0.18)] ring-0"
      >
        <DialogHeader className="gap-3">
          <DialogTitle className="text-h-20 tracking-normal text-gray-900">
            게시하지 않은 변경사항이 있습니다
          </DialogTitle>
          <DialogDescription className="text-h-18-regular leading-[27px] tracking-normal text-gray-600">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="-mx-0 -mb-0 mt-7 flex-row justify-end gap-3 rounded-none border-0 bg-transparent p-0">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="h-11 rounded-[8px] px-6"
          >
            머무르기
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
            className="h-11 rounded-[8px] px-6"
          >
            나가기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PublishDiffPreview({
  currentContent,
  publishedContent,
}: {
  currentContent: string;
  publishedContent: string;
}) {
  const diffNodes = createNodesWithProposalDiff({
    baseContent: publishedContent,
    nextContent: currentContent,
  }).filter((node) => node.type === "proposal");

  return (
    <div className="mt-5 max-h-[260px] overflow-auto rounded-[8px] border border-gray-200 bg-gray-50 p-4">
      {diffNodes.length ? (
        <div className="space-y-3">
          {diffNodes.map((node) => (
            <div key={node.id} className="space-y-1 text-body-14-regular">
              {node.before.map((line, index) => (
                <div
                  key={`dialog-before-${index}-${line}`}
                  className="text-red-500 line-through"
                >
                  {formatDiffLine(line)}
                </div>
              ))}
              {node.after.map((line, index) => (
                <div
                  key={`dialog-after-${index}-${line}`}
                  className="font-medium text-green-500"
                >
                  {formatDiffLine(line)}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-body-14-regular text-gray-500">
          변경된 줄이 없습니다.
        </p>
      )}
    </div>
  );
}

function getPublishedContent(fixture: HandoverFixture) {
  return (
    fixture.document.publishedContent ??
    fixture.document.blocks
      .map((block) => {
        if (block.type === "heading") {
          return `${"#".repeat(block.level)} ${block.text}`;
        }

        if (block.type === "paragraph") {
          return block.lines.join("\n");
        }

        if (block.type === "list") {
          return block.items
            .map((item) =>
              `- ${item.segments.map((segment) => segment.text).join("")}`,
            )
            .join("\n");
        }

        if (block.type === "divider") {
          return "---";
        }

        return [
          ...block.suggestion.unchanged.map((line) => `- ${line}`),
          ...block.suggestion.inserted.map((line) => `- ${line}`),
        ].join("\n");
      })
      .join("\n")
  );
}

function appendUserMessage(
  messages: readonly HandoverChatMessage[],
  instruction: string,
): readonly HandoverChatMessage[] {
  const id = `user-${Date.now()}`;

  return messages.concat([{ id, role: "user", text: instruction }]);
}

function appendAssistantMessage(
  messages: readonly HandoverChatMessage[],
  message: string,
): readonly HandoverChatMessage[] {
  const id = `assistant-${Date.now()}`;

  return messages.concat([{ id, role: "assistant", text: message }]);
}

function formatDiffLine(markdown: string) {
  const displayText = getLineDisplayText(markdown);

  if (!displayText) {
    return "(빈 줄)";
  }

  if (/^[-*]\s+/.test(markdown)) {
    return `- ${displayText}`;
  }

  return displayText;
}

function resizeTextarea(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function getAnchorFromEventTarget(target: EventTarget | null) {
  return target instanceof Element
    ? target.closest<HTMLAnchorElement>("a[href]")
    : null;
}

function getNavigationTarget(anchor: HTMLAnchorElement) {
  const url = new URL(anchor.href, window.location.href);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }

  const currentUrl = new URL(window.location.href);

  if (url.href === currentUrl.href) {
    return null;
  }

  if (url.origin !== currentUrl.origin) {
    return { href: url.href };
  }

  return {
    href: url.href,
    internalPath: `${url.pathname}${url.search}${url.hash}`,
  };
}
