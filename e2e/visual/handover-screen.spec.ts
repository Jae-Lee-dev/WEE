import { expect, test } from "playwright/test";
import { captureActualScreenshot, prepareVisualPage } from "./helpers";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`HO-01 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/handover", viewport });
    await page.evaluate(() => document.fonts.ready);

    await expect(page.getByTestId("handover-screen")).toBeVisible();
    await expect(page.getByTestId("handover-editor")).toBeVisible();
    await expect(page.getByTestId("handover-chat-panel")).toBeVisible();
    const toolbar = page.getByTestId("handover-editor-toolbar");

    await expect(page.getByRole("textbox", { name: "제목" }).first()).toHaveValue(
      "업무 공통 안내",
    );
    await expect(page.getByText("AI 수정 요청")).toBeVisible();
    await expect(toolbar.getByRole("button", { name: "본문" })).toBeVisible();
    await expect(toolbar.getByRole("button", { name: "H1" })).toBeVisible();
    await expect(toolbar.getByRole("button", { name: "H2" })).toBeVisible();
    await expect(toolbar.getByRole("button", { name: "H3" })).toBeVisible();
    await expect(
      toolbar.getByRole("button", { exact: true, name: "목록" }),
    ).toBeVisible();
    await expect(toolbar.getByRole("button", { name: "구분선" })).toBeVisible();
    await expect(toolbar.getByRole("button", { name: "삭제" })).toBeVisible();
    await expect(page.getByText("Standard")).toHaveCount(0);
    await expect(
      page.getByText("안녕하세요! 인수인계 문서 편집을 도와드립니다."),
    ).toHaveCount(0);
    await expect(
      page.getByPlaceholder("수정 요청을 입력하세요..."),
    ).toBeVisible();
    await expect(page.getByTestId("handover-prompt-starters")).toBeVisible();
    await expect(page.getByText("자주 쓰는 요청")).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "오늘 전달사항을 간결하게 정리해줘",
      }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "전송" })).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "HO-01",
      viewport,
    });
  });
}

test("HO-01 editor formats blocks and deletes dividers", async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/handover",
    viewport: "laptop-1366",
  });
  await page.evaluate(() => document.fonts.ready);

  const paragraph = page.getByRole("textbox", { name: "문단" }).first();
  const paragraphValue = await paragraph.inputValue();
  const toolbar = page.getByTestId("handover-editor-toolbar");

  await paragraph.focus();
  await toolbar.getByRole("button", { exact: true, name: "목록" }).click();

  const listItemValues = await page
    .getByRole("textbox", { name: "목록 항목" })
    .evaluateAll((elements) =>
      elements.map((element) => (element as HTMLTextAreaElement).value),
    );

  expect(listItemValues).toContain(paragraphValue);

  const dividerCount = await page.getByTestId("handover-divider-block").count();

  await toolbar.getByRole("button", { name: "구분선" }).click();
  await expect(page.getByTestId("handover-divider-block")).toHaveCount(
    dividerCount + 1,
  );

  await toolbar.getByRole("button", { name: "삭제" }).click();
  await expect(page.getByTestId("handover-divider-block")).toHaveCount(
    dividerCount,
  );
});

test("HO-01 enter creates and backspace removes an explicit editor block", async ({
  page,
}) => {
  await prepareVisualPage({
    page,
    path: "/handover",
    viewport: "laptop-1366",
  });
  await page.evaluate(() => document.fonts.ready);

  const textboxCount = await page.getByRole("textbox").count();
  const paragraph = page.getByRole("textbox", { name: "문단" }).first();

  await paragraph.focus();
  await paragraph.press("Enter");

  await expect(page.getByRole("textbox")).toHaveCount(textboxCount + 1);
  await expect(page.locator("textarea:focus")).toHaveAttribute(
    "aria-label",
    "빈 줄",
  );

  await page.keyboard.press("Backspace");

  await expect(page.getByRole("textbox")).toHaveCount(textboxCount);
  await expect(page.locator("textarea:focus")).toHaveAttribute(
    "aria-label",
    "문단",
  );
});

test("HO-01 AI proposal blocks changed rows until review", async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/handover",
    viewport: "laptop-1366",
  });
  await page.evaluate(() => document.fonts.ready);

  await page
    .getByPlaceholder("수정 요청을 입력하세요...")
    .fill("수학 A반 섹션에 보강 자료 프린트 준비 항목을 추가해줘");
  await page.getByRole("button", { name: "전송" }).click();

  const proposal = page.getByTestId("handover-proposal-block").first();
  await expect(proposal).toBeVisible();
  await expect(proposal).toContainText("보강 자료 프린트 준비");
  await expect(page.getByPlaceholder("수정안을 먼저 검토해 주세요.")).toBeDisabled();
  await expect(page.getByRole("button", { name: "게시" })).toBeDisabled();

  await proposal.getByRole("button", { name: "반영" }).click();

  await expect(page.getByTestId("handover-proposal-block")).toHaveCount(0);
  const listItems = await page
    .getByRole("textbox", { name: "목록 항목" })
    .evaluateAll((elements) =>
      elements.map((element) => (element as HTMLTextAreaElement).value),
    );
  expect(listItems).toContain("보강 자료 프린트 준비");
  await expect(page.getByPlaceholder("수정 요청을 입력하세요...")).toBeEnabled();
});

test("HO-01 prompt starter fills the request input", async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/handover",
    viewport: "laptop-1366",
  });
  await page.evaluate(() => document.fonts.ready);

  const starter = page.getByRole("button", {
    name: "수학 A반 유의사항을 보강해줘",
  });
  await starter.click();

  await expect(page.getByLabel("수정할 내용")).toHaveValue(
    "수학 A반 유의사항을 보강해줘",
  );
  await expect(page.getByTestId("handover-prompt-starters")).toBeVisible();
});

test("HO-01 blocks screen navigation when unpublished edits exist", async ({
  page,
}) => {
  await prepareVisualPage({
    page,
    path: "/handover",
    viewport: "laptop-1366",
  });
  await page.evaluate(() => document.fonts.ready);

  await page
    .getByRole("textbox", { name: "제목" })
    .first()
    .fill("업무 공통 안내 수정");
  await page.getByTestId("admin-sidebar-item-dashboard").click();

  const dialog = page.getByTestId("handover-unsaved-navigation-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("게시하지 않은 변경사항이 있습니다");
  await expect(page).toHaveURL(/\/handover$/);

  await dialog.getByRole("button", { name: "머무르기" }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/handover$/);

  await page.getByTestId("admin-sidebar-item-dashboard").click();
  await page
    .getByTestId("handover-unsaved-navigation-dialog")
    .getByRole("button", { name: "나가기" })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
