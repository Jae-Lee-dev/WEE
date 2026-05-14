import { expect, test } from "playwright/test";
import { captureActualScreenshot, prepareVisualPage } from "./helpers";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`HO-01 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/handover", viewport });
    await page.evaluate(() => document.fonts.ready);

    await expect(page.getByTestId("handover-screen")).toBeVisible();
    await expect(page.getByTestId("handover-editor")).toBeVisible();
    await expect(page.getByTestId("handover-chat-panel")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "제목" }).first()).toHaveValue(
      "업무 공통 안내",
    );
    await expect(page.getByText("AI 채팅 편집")).toBeVisible();
    await expect(page.getByText("Standard")).toBeVisible();
    await expect(
      page.getByPlaceholder("수정할 내용을 입력하세요..."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "전송" })).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "HO-01",
      viewport,
    });
  });
}

test("HO-01 AI proposal blocks changed rows until review", async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/handover",
    viewport: "laptop-1366",
  });
  await page.evaluate(() => document.fonts.ready);

  await page
    .getByPlaceholder("수정할 내용을 입력하세요...")
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
  await expect(page.getByPlaceholder("수정할 내용을 입력하세요...")).toBeEnabled();
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
