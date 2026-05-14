export const runtime = "nodejs";

type GeminiGenerateContentResponse = {
  candidates?: {
    content?: {
      parts?: {
        text?: string;
      }[];
    };
  }[];
  error?: {
    message?: string;
  };
};

type HandoverDraftAttachment = {
  data: string;
  mimeType: string;
  name: string;
  size: number;
};

type GeminiRequestPart =
  | {
      text: string;
    }
  | {
      inlineData: {
        data: string;
        mimeType: string;
      };
    };

const defaultModel = "gemini-2.5-flash";
const maxAttachmentCount = 4;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const attachments = readBodyAttachments(body);
  const content = readBodyString(body, "content");
  const instruction = readBodyString(body, "instruction");

  if (!content.trim()) {
    return Response.json(
      { error: "편집할 인수인계 문서가 비어 있습니다." },
      { status: 400 },
    );
  }

  if (!instruction.trim()) {
    return Response.json(
      { error: "수정 지시를 입력해 주세요." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "GEMINI_API_KEY가 설정되어 있지 않습니다." },
      { status: 503 },
    );
  }

  const model = normalizeModelName(process.env.GEMINI_MODEL ?? defaultModel);
  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      body: JSON.stringify(
        createGeminiRequest({ attachments, content, instruction }),
      ),
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      method: "POST",
    },
  );
  const data = (await geminiResponse
    .json()
    .catch(() => null)) as GeminiGenerateContentResponse | null;

  if (!geminiResponse.ok) {
    return Response.json(
      {
        error:
          data?.error?.message ?? "Gemini API에서 수정안을 생성하지 못했습니다.",
      },
      { status: geminiResponse.status },
    );
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    return Response.json(
      { error: "Gemini API 응답이 비어 있습니다." },
      { status: 502 },
    );
  }

  const parsed = parseAiEditResponse(text);

  if (!parsed) {
    return Response.json(
      { error: "Gemini API 응답을 해석하지 못했습니다." },
      { status: 502 },
    );
  }

  if (!parsed.nextContent.trim()) {
    return Response.json(
      { error: "Gemini API가 빈 문서를 반환했습니다." },
      { status: 502 },
    );
  }

  return Response.json(parsed);
}

function createGeminiRequest({
  attachments,
  content,
  instruction,
}: {
  attachments: readonly HandoverDraftAttachment[];
  content: string;
  instruction: string;
}) {
  return {
    contents: [
      {
        parts: createGeminiParts({ attachments, content, instruction }),
        role: "user",
      },
    ],
    generationConfig: {
      responseJsonSchema: {
        additionalProperties: false,
        properties: {
          message: {
            description: "관리자에게 보여줄 한 문장 요약",
            type: "string",
          },
          nextContent: {
            description: "수정이 반영된 전체 Markdown 문서",
            type: "string",
          },
        },
        required: ["message", "nextContent"],
        type: "object",
      },
      responseMimeType: "application/json",
      temperature: 0.2,
    },
    systemInstruction: {
      parts: [
        {
          text: [
            "너는 Wee 학원 관리자 웹의 인수인계 문서 편집 도우미다.",
            "관리자의 지시에 따라 현재 Markdown 문서를 수정하되, 반드시 수정된 전체 Markdown 문서를 반환한다.",
            "지원 Markdown은 #, ##, ### heading, -, *, 순서 없는 목록, **bold**, inline `code`, --- divider다.",
            "기존 문서의 사실관계와 섹션 순서를 최대한 보존하고, 지시와 관련 없는 내용을 임의로 삭제하거나 확장하지 않는다.",
            "이전 채팅 히스토리는 없다고 가정하고, 현재 문서와 이번 지시만 따른다.",
            '반환은 JSON 객체 하나만 사용한다. 정확한 키는 "message"와 "nextContent"다.',
            "nextContent는 일부 diff나 설명이 아니라 수정된 전체 Markdown 문서여야 한다.",
          ].join("\n"),
        },
      ],
    },
  };
}

function createGeminiParts({
  attachments,
  content,
  instruction,
}: {
  attachments: readonly HandoverDraftAttachment[];
  content: string;
  instruction: string;
}): GeminiRequestPart[] {
  const parts: GeminiRequestPart[] = [
    {
      text: [
        "현재 인수인계 문서:",
        "```md",
        content,
        "```",
        "",
        "관리자 수정 지시:",
        instruction,
        "",
        attachments.length
          ? "첨부파일은 이번 지시를 해석하기 위한 참고자료다. 문서에 반영할 내용만 추려서 사용한다."
          : "",
        '반드시 {"message": "...", "nextContent": "..."} 형태의 JSON만 반환한다.',
        "nextContent에는 수정이 반영된 전체 Markdown 문서를 문자열로 넣는다.",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];

  attachments.forEach((attachment, index) => {
    const label = `첨부파일 ${index + 1}: ${attachment.name} (${attachment.mimeType}, ${attachment.size} bytes)`;

    if (isTextAttachment(attachment)) {
      const text = decodeBase64Text(attachment.data);

      parts.push({
        text: [
          label,
          "```",
          text.slice(0, 40_000),
          text.length > 40_000 ? "\n...(첨부파일 내용 일부 생략)" : "",
          "```",
        ]
          .filter(Boolean)
          .join("\n"),
      });
      return;
    }

    parts.push({ text: label });
    parts.push({
      inlineData: {
        data: attachment.data,
        mimeType: attachment.mimeType,
      },
    });
  });

  return parts;
}

function parseAiEditResponse(text: string) {
  const jsonText = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const parsed = parseJsonObject(jsonText);

  if (!parsed) {
    return null;
  }

  return {
    message:
      typeof parsed.message === "string" && parsed.message.trim()
        ? parsed.message
        : "수정안을 만들었습니다. 문서에서 변경사항을 확인해 주세요.",
    nextContent: normalizeMarkdownBlock(
      readFirstString(parsed, [
        "nextContent",
        "next_content",
        "markdown",
        "content",
        "revisedMarkdown",
        "revisedContent",
        "document",
      ]),
    ),
  };
}

function parseJsonObject(text: string) {
  try {
    const parsed = JSON.parse(text);

    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function readBodyString(body: unknown, key: "content" | "instruction") {
  if (typeof body !== "object" || body === null) {
    return "";
  }

  const value = (body as Record<string, unknown>)[key];

  return typeof value === "string" ? value : "";
}

function readBodyAttachments(body: unknown): HandoverDraftAttachment[] {
  if (typeof body !== "object" || body === null) {
    return [];
  }

  const value = (body as Record<string, unknown>).attachments;

  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, maxAttachmentCount).flatMap((item) => {
    if (typeof item !== "object" || item === null) {
      return [];
    }

    const record = item as Record<string, unknown>;
    const data = readString(record.data);
    const mimeType = readString(record.mimeType) || "application/octet-stream";
    const name = readString(record.name) || "attachment";
    const size = typeof record.size === "number" ? record.size : 0;

    if (!data || !isSupportedAttachmentMimeType(mimeType)) {
      return [];
    }

    return [{ data, mimeType, name, size }];
  });
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isSupportedAttachmentMimeType(mimeType: string) {
  return (
    isTextMimeType(mimeType) ||
    mimeType === "application/pdf" ||
    mimeType.startsWith("image/")
  );
}

function isTextAttachment(attachment: HandoverDraftAttachment) {
  return isTextMimeType(attachment.mimeType);
}

function isTextMimeType(mimeType: string) {
  return (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml" ||
    mimeType === "application/javascript" ||
    mimeType === "application/x-ndjson"
  );
}

function decodeBase64Text(data: string) {
  return Buffer.from(data, "base64").toString("utf8");
}

function readFirstString(
  source: Record<string, unknown>,
  keys: readonly string[],
) {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string") {
      return value;
    }
  }

  return "";
}

function normalizeMarkdownBlock(text: string) {
  return text
    .trim()
    .replace(/^```(?:markdown|md)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trimEnd();
}

function normalizeModelName(model: string) {
  return encodeURIComponent(model.trim().replace(/^models\//, "") || defaultModel);
}
