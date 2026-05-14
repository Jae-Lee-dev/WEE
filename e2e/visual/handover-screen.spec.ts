import { expect, test } from "playwright/test";
import { captureActualScreenshot, prepareVisualPage } from "./helpers";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`HO-01 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/handover", viewport });
    await page.evaluate(() => document.fonts.ready);

    await expect(page.getByTestId("handover-screen")).toBeVisible();
    await expect(page.getByTestId("handover-editor")).toBeVisible();
    await expect(page.getByTestId("handover-chat-panel")).toBeVisible();
    const editor = page
      .getByTestId("handover-editor")
      .locator(".handover-tiptap-prosemirror");
    const toolbar = page.getByTestId("handover-editor-toolbar");

    await expect(editor.locator("h1").first()).toHaveText("업무 공통 안내");
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

  const editor = page
    .getByTestId("handover-editor")
    .locator(".handover-tiptap-prosemirror");
  const paragraph = editor
    .locator("p")
    .filter({ hasText: "반드시 앱에서 출근 처리를 완료해주세요." })
    .first();
  const paragraphValue = await paragraph.textContent();
  const toolbar = page.getByTestId("handover-editor-toolbar");
  const listButton = toolbar.getByRole("button", {
    exact: true,
    name: "목록",
  });

  await paragraph.click();
  await listButton.click();

  await expect(
    editor.locator("li").filter({ hasText: paragraphValue ?? "" }),
  ).toBeVisible();
  await expect(
    editor.locator("ul").filter({ hasText: paragraphValue ?? "" }).first(),
  ).toHaveCSS("list-style-type", "disc");
  await page.mouse.move(0, 0);
  await expect(listButton).toHaveCSS("background-color", "rgb(48, 193, 121)");

  const dividerCount = await editor.locator("hr").count();

  await toolbar.getByRole("button", { name: "구분선" }).click();
  await expect(editor.locator("hr")).toHaveCount(dividerCount + 1);

  await page.keyboard.press("Backspace");
  await expect(editor.locator("hr")).toHaveCount(dividerCount);
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

  const editor = page
    .getByTestId("handover-editor")
    .locator(".handover-tiptap-prosemirror");
  const paragraphCount = await editor.locator("p").count();
  const paragraph = editor
    .locator("p")
    .filter({ hasText: "반드시 앱에서 출근 처리를 완료해주세요." })
    .first();

  await paragraph.click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");

  await expect(editor.locator("p")).toHaveCount(paragraphCount + 1);

  await page.keyboard.press("Backspace");
  await expect(editor.locator("p")).toHaveCount(paragraphCount);
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
  await expect(
    page
      .getByTestId("handover-editor")
      .locator("li")
      .filter({ hasText: "보강 자료 프린트 준비" }),
  ).toBeVisible();
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

test("HO-01 chat input does not send while IME is composing", async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/handover",
    viewport: "laptop-1366",
  });
  await page.evaluate(() => document.fonts.ready);

  const input = page.getByLabel("수정할 내용");

  await input.fill("한글 조합 중");
  await input.evaluate((element) => {
    element.dispatchEvent(
      new CompositionEvent("compositionstart", {
        bubbles: true,
        data: "ㅎ",
      }),
    );
  });
  await input.press("Enter");

  await expect(input).toHaveValue("한글 조합 중");
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
    .getByTestId("handover-editor")
    .locator(".handover-tiptap-prosemirror h1")
    .first()
    .click();
  await page.keyboard.press("End");
  await page.keyboard.insertText(" 수정");
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
