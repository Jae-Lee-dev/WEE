import { expect, test } from "playwright/test";
import { captureActualScreenshot, prepareVisualPage } from "./helpers";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`LANDING-01 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/", viewport });
    await page.evaluate(() => document.fonts.ready);

    await expect(page.getByTestId("landing-page")).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /조교 관리는 더 가볍게,\s*운영 통제는 더 정확하게\./,
        level: 1,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "무료로 시작하기" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: "운영 인박스 대시보드 화면" }),
    ).toBeVisible();
    await expect(page.getByRole("img", { name: "급여 관리 화면" })).toBeVisible();
    await expect(page.getByRole("img", { name: "AI 인수인계 화면" })).toBeVisible();
    const dashboardPreviewCrop = await page
      .getByRole("img", { name: "운영 인박스 대시보드 화면" })
      .evaluate((image) => {
        const imageRect = image.getBoundingClientRect();
        const frameRect = image.parentElement?.getBoundingClientRect();

        return {
          imageLeft: imageRect.left,
          imageWidth: imageRect.width,
          frameLeft: frameRect?.left ?? 0,
          frameWidth: frameRect?.width ?? 0,
        };
      });
    expect(dashboardPreviewCrop.imageLeft).toBeLessThan(dashboardPreviewCrop.frameLeft);
    expect(dashboardPreviewCrop.imageWidth).toBeGreaterThan(dashboardPreviewCrop.frameWidth * 1.4);

    await captureActualScreenshot({
      page,
      screenId: "LANDING-01",
      viewport,
    });

    await page.getByTestId("landing-footer").scrollIntoViewIfNeeded();
    await expect(page.getByRole("img", { name: "EduU Learning" })).toHaveCount(0);
    await expect(page.getByText("(주)에듀유러닝")).toHaveCount(0);
    await expect(page.getByText("서울시 성북구 안암로 145, 파이빌99")).toHaveCount(0);
    await expect(page.getByText("이재준")).toHaveCount(0);
    await expect(page.getByText("jc@eduulearning.com")).toHaveCount(0);
    await expect(page.getByText("02-546-5561")).toHaveCount(0);
    await expect(page.getByText("Wee는 조교 운영과 근태·정산 흐름")).toBeVisible();
    await expect(page.getByRole("link", { name: "이용약관" })).toBeVisible();
    await expect(page.getByRole("link", { name: "개인정보처리방침" })).toBeVisible();
    const footerBox = await page.getByTestId("landing-footer").boundingBox();
    const footerContentBox = await page.getByTestId("landing-footer-content").boundingBox();
    expect(footerBox).not.toBeNull();
    expect(footerContentBox).not.toBeNull();
    expect(footerContentBox!.width).toBeLessThan(footerBox!.width - 160);

    await captureActualScreenshot({
      page,
      screenId: "LANDING-01",
      state: "footer",
      viewport,
    });
  });
}
