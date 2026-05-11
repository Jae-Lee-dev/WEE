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
    heading: "소속 생성",
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

test("AUTH-01 keeps login layout compact without page scroll", async ({ page }) => {
  await prepareVisualPage({ page, path: "/login", viewport: "laptop-1366" });
  await page.evaluate(() => document.fonts.ready);

  await expect(page.locator('nav[aria-label="진입 메뉴"]')).toHaveCount(0);

  const rememberCheckbox = page.getByRole("checkbox", {
    name: "로그인 유지",
  });
  await expect(rememberCheckbox).toBeVisible();
  await rememberCheckbox.click();
  await expect(rememberCheckbox).toHaveAttribute("data-state", "checked");

  const metrics = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const loginScreen = document.querySelector('[data-testid="login-screen"]');
    const card = loginScreen?.parentElement?.parentElement;
    const checkbox = document.querySelector('[role="checkbox"]');

    return {
      cardWidth: card?.getBoundingClientRect().width ?? 0,
      checkboxBackground:
        checkbox instanceof HTMLElement
          ? getComputedStyle(checkbox).backgroundColor
          : "",
      pageOverflowY: Math.max(
        root.scrollHeight - root.clientHeight,
        body.scrollHeight - body.clientHeight,
      ),
      socialLoginCount: document.querySelectorAll('[aria-label="소셜 로그인"]')
        .length,
    };
  });

  expect(metrics.pageOverflowY).toBeLessThanOrEqual(1);
  expect(metrics.cardWidth).toBeLessThanOrEqual(480);
  expect(metrics.checkboxBackground).not.toBe("rgb(0, 0, 0)");
  expect(metrics.socialLoginCount).toBe(0);
});

test("AUTH-02 validates native signup before Firebase submit", async ({
  page,
}) => {
  await prepareVisualPage({ page, path: "/signup", viewport: "laptop-1366" });
  await page.evaluate(() => document.fonts.ready);
  const signupAlert = page.getByTestId("signup-alert");

  await page
    .getByRole("button", { name: "회원가입하고 인증 메일 받기" })
    .click();
  await expect(signupAlert).toHaveText("입력 내용을 다시 확인해 주세요.");
  await expect(page.getByText("이름을 입력해 주세요.")).toBeVisible();
  await expect(
    page.getByText("서비스 이용약관과 개인정보 처리방침에 동의해 주세요."),
  ).toBeVisible();

  await expect(page.getByTestId("password-requirement-length")).toHaveAttribute(
    "data-state",
    "unmet",
  );
  await expect(page.getByTestId("password-requirement-number")).toHaveAttribute(
    "data-state",
    "unmet",
  );

  await page.getByLabel("이름").fill("김민채");
  await page.getByLabel("이메일").fill("admin@wee.kr");
  await page.getByLabel("비밀번호", { exact: true }).fill("password");
  await page.getByLabel("비밀번호 확인", { exact: true }).fill("password");

  await expect(page.getByTestId("password-requirement-length")).toHaveAttribute(
    "data-state",
    "met",
  );
  await expect(page.getByTestId("password-requirement-letter")).toHaveAttribute(
    "data-state",
    "met",
  );
  await expect(page.getByTestId("password-requirement-number")).toHaveAttribute(
    "data-state",
    "unmet",
  );
  await page
    .getByRole("button", { name: "회원가입하고 인증 메일 받기" })
    .click();
  await expect(signupAlert).toHaveText("입력 내용을 다시 확인해 주세요.");
  await expect(page.getByText("비밀번호는 숫자를 포함해야 합니다.")).toBeVisible();

  const passwordInput = page.getByLabel("비밀번호", { exact: true });
  await expect(passwordInput).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "비밀번호 보기", exact: true }).click();
  await expect(passwordInput).toHaveAttribute("type", "text");
});

test("AUTH-02 submits native signup through Firebase Auth", async ({
  page,
}) => {
  const authRequests: string[] = [];

  await page.route(
    /https:\/\/identitytoolkit\.googleapis\.com\/v1\/accounts:(signUp|lookup|update|sendOobCode).*/,
    async (route) => {
      const requestUrl = route.request().url();
      authRequests.push(requestUrl);

      if (requestUrl.includes("accounts:signUp")) {
        await route.fulfill({
          contentType: "application/json",
          json: {
            email: "manager@wee.kr",
            expiresIn: "3600",
            idToken: "mock-id-token",
            kind: "identitytoolkit#SignupNewUserResponse",
            localId: "test-manager-uid",
            refreshToken: "mock-refresh-token",
          },
        });
        return;
      }

      if (requestUrl.includes("accounts:update")) {
        await route.fulfill({
          contentType: "application/json",
          json: {
            displayName: "김민채",
            email: "manager@wee.kr",
            expiresIn: "3600",
            idToken: "mock-id-token",
            kind: "identitytoolkit#SetAccountInfoResponse",
            localId: "test-manager-uid",
            refreshToken: "mock-refresh-token",
          },
        });
        return;
      }

      if (requestUrl.includes("accounts:lookup")) {
        await route.fulfill({
          contentType: "application/json",
          json: {
            kind: "identitytoolkit#GetAccountInfoResponse",
            users: [
              {
                displayName: "김민채",
                email: "manager@wee.kr",
                emailVerified: false,
                localId: "test-manager-uid",
                providerUserInfo: [
                  {
                    email: "manager@wee.kr",
                    providerId: "password",
                    rawId: "manager@wee.kr",
                  },
                ],
                validSince: "0",
              },
            ],
          },
        });
        return;
      }

      await route.fulfill({
        contentType: "application/json",
        json: {
          email: "manager@wee.kr",
          kind: "identitytoolkit#GetOobConfirmationCodeResponse",
        },
      });
    },
  );

  await prepareVisualPage({ page, path: "/signup", viewport: "laptop-1366" });
  await page.evaluate(() => document.fonts.ready);

  await page.getByLabel("이름").fill("김민채");
  await page.getByLabel("이메일").fill("manager@wee.kr");
  await page.getByLabel("비밀번호", { exact: true }).fill("password1");
  await page.getByLabel("비밀번호 확인", { exact: true }).fill("password1");
  await page
    .getByRole("checkbox", {
      name: "서비스 이용약관과 개인정보 처리방침에 동의합니다.",
    })
    .click();
  await page
    .getByRole("button", { name: "회원가입하고 인증 메일 받기" })
    .click();

  await expect(page).toHaveURL(/\/onboarding\/workspace$/);
  expect(authRequests.some((url) => url.includes("accounts:signUp"))).toBe(
    true,
  );
  expect(authRequests.some((url) => url.includes("accounts:update"))).toBe(
    true,
  );
  expect(authRequests.some((url) => url.includes("accounts:sendOobCode"))).toBe(
    true,
  );
});
