import { expect, test } from "playwright/test";
import { captureActualScreenshot, prepareVisualPage } from "./helpers";

const entryPages = [
  {
    screenId: "AUTH-01",
    path: "/login",
    testId: "login-screen",
    heading: "로그인",
  },
  {
    screenId: "AUTH-02",
    path: "/signup",
    testId: "signup-screen",
    heading: "회원가입",
  },
  {
    screenId: "AUTH-03",
    path: "/forgot-password",
    testId: "forgot-password-screen",
    heading: "아이디/비밀번호 찾기",
  },
  {
    screenId: "ONB-01",
    path: "/onboarding/workspace",
    testId: "workspace-onboarding-screen",
    heading: "사업장 생성",
  },
  {
    screenId: "ONB-02",
    path: "/onboarding/setup",
    testId: "setup-guide-screen",
    heading: "초기 설정 가이드",
  },
] as const;

for (const entryPage of entryPages) {
  for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
    test(`${entryPage.screenId} default ${viewport}`, async ({ page }) => {
      await prepareVisualPage({ page, path: entryPage.path, viewport });
      await page.evaluate(() => document.fonts.ready);

      await expect(
        page.getByRole("heading", { name: entryPage.heading, level: 1 }),
      ).toBeVisible();
      await expect(page.getByTestId(entryPage.testId)).toBeVisible();

      await captureActualScreenshot({
        page,
        screenId: entryPage.screenId,
        viewport,
      });
    });
  }
}
