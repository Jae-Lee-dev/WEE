import { expect, test } from "playwright/test";
import { captureActualScreenshot, prepareVisualPage } from "./helpers";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`HO-01 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/handover", viewport });
    await page.evaluate(() => document.fonts.ready);

    await expect(page.getByTestId("handover-screen")).toBeVisible();
    await expect(page.getByTestId("handover-editor")).toBeVisible();
    await expect(page.getByTestId("handover-chat-panel")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "업무 공통 안내" }),
    ).toBeVisible();
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
