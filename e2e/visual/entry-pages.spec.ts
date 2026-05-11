import { expect, test, type Page } from "playwright/test";
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
    heading: "관리자 설정으로 이어가기",
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
  await expect(page.getByRole("img", { name: "Wee" })).toBeVisible();

  const rememberCheckbox = page.getByRole("checkbox", {
    name: "로그인 유지",
  });
  await expect(rememberCheckbox).toBeVisible();
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

test("AUTH-01 validates native login before Firebase submit", async ({
  page,
}) => {
  await prepareVisualPage({ page, path: "/login", viewport: "laptop-1366" });
  await page.evaluate(() => document.fonts.ready);

  const loginAlert = page.getByTestId("login-alert");
  const loginButton = page.getByRole("button", {
    name: "로그인",
    exact: true,
  });
  const buttonTopBeforeErrors = await loginButton.evaluate(
    (element) => element.getBoundingClientRect().top + window.scrollY,
  );

  await loginButton.click();
  await expect(loginAlert).toHaveText("이메일과 비밀번호를 입력해 주세요.");
  await expect(
    page.getByText("이메일을 입력해 주세요.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("비밀번호를 입력해 주세요.", { exact: true }),
  ).toBeVisible();
  const buttonTopAfterErrors = await loginButton.evaluate(
    (element) => element.getBoundingClientRect().top + window.scrollY,
  );
  expect(
    Math.abs(buttonTopAfterErrors - buttonTopBeforeErrors),
  ).toBeLessThanOrEqual(0.1);

  await page.getByLabel("이메일").fill("manager");
  await page.getByLabel("비밀번호").fill("password1");
  await loginButton.click();
  await expect(loginAlert).toHaveText("이메일과 비밀번호를 입력해 주세요.");
  await expect(page.getByText("이메일 형식을 확인해 주세요.")).toBeVisible();
});

test("AUTH-01 submits native login through Firebase Auth", async ({ page }) => {
  const authRequests: string[] = [];
  const loginPayloads: { email?: string; password?: string }[] = [];

  await page.route(
    /https:\/\/identitytoolkit\.googleapis\.com\/v1\/accounts:(signInWithPassword|lookup).*/,
    async (route) => {
      const requestUrl = route.request().url();
      authRequests.push(requestUrl);

      if (requestUrl.includes("accounts:signInWithPassword")) {
        const requestBody = route.request().postDataJSON() as {
          email?: string;
          password?: string;
        };
        loginPayloads.push(requestBody);

        await route.fulfill({
          contentType: "application/json",
          json: {
            displayName: "김민채",
            email: "manager@gmail.com",
            expiresIn: "3600",
            idToken: "mock-id-token",
            kind: "identitytoolkit#VerifyPasswordResponse",
            localId: "test-manager-uid",
            refreshToken: "mock-refresh-token",
            registered: true,
          },
        });
        return;
      }

      await route.fulfill({
        contentType: "application/json",
        json: {
          kind: "identitytoolkit#GetAccountInfoResponse",
          users: [
            {
              displayName: "김민채",
              email: "manager@gmail.com",
              emailVerified: true,
              localId: "test-manager-uid",
              providerUserInfo: [
                {
                  email: "manager@gmail.com",
                  providerId: "password",
                  rawId: "manager@gmail.com",
                },
              ],
              validSince: "0",
            },
          ],
        },
      });
    },
  );

  await prepareVisualPage({ page, path: "/login", viewport: "laptop-1366" });
  await page.evaluate(() => document.fonts.ready);

  await page.getByLabel("이메일").fill("manager@gmail.com");
  await page.getByLabel("비밀번호").fill("password1");
  await page.getByRole("checkbox", { name: "로그인 유지" }).click();
  await page.getByRole("button", { name: "로그인", exact: true }).click();

  await expect(page).toHaveURL(/\/onboarding\/workspace$/);
  expect(loginPayloads[0]).toMatchObject({
    email: "manager@gmail.com",
    password: "password1",
  });
  expect(
    authRequests.some((url) => url.includes("accounts:signInWithPassword")),
  ).toBe(true);
});

test("AUTH-02 keeps signup fields in a single column", async ({ page }) => {
  await prepareVisualPage({ page, path: "/signup", viewport: "laptop-1366" });
  await page.evaluate(() => document.fonts.ready);

  const metrics = await page.evaluate(() => {
    const root = document.documentElement;
    const controlSelectors = [
      "#signup-name",
      '[data-testid="signup-email-control"]',
      "#signup-password",
      "#signup-password-confirm",
    ];
    const fields = controlSelectors.map((selector) => {
      const field = document.querySelector(selector);
      const rect = field?.getBoundingClientRect();

      return {
        bottom: rect?.bottom ?? 0,
        left: rect?.left ?? 0,
        top: rect?.top ?? 0,
        width: rect?.width ?? 0,
      };
    });
    const signupScreen = document.querySelector('[data-testid="signup-screen"]');
    const card = signupScreen?.parentElement?.parentElement;
    const cardRect = card?.getBoundingClientRect();
    const emailControl = document.querySelector(
      '[data-testid="signup-email-control"]',
    );
    const emailInputRect = emailControl
      ?.querySelector("input")
      ?.getBoundingClientRect();
    const emailDomainRect = emailControl
      ?.querySelector('[data-slot="select-trigger"]')
      ?.getBoundingClientRect();

    return {
      cardWidth: cardRect?.width ?? 0,
      emailDomainWidth: emailDomainRect?.width ?? 0,
      emailInputWidth: emailInputRect?.width ?? 0,
      fields,
      horizontalOverflow: root.scrollWidth - root.clientWidth,
    };
  });

  expect(metrics.cardWidth).toBeLessThanOrEqual(520);
  expect(metrics.horizontalOverflow).toBeLessThanOrEqual(1);
  expect(
    Math.abs(metrics.emailInputWidth - metrics.emailDomainWidth),
  ).toBeLessThanOrEqual(1);

  for (const field of metrics.fields) {
    expect(Math.abs(field.left - metrics.fields[0].left)).toBeLessThanOrEqual(
      1,
    );
    expect(Math.abs(field.width - metrics.fields[0].width)).toBeLessThanOrEqual(
      1,
    );
  }

  for (let index = 1; index < metrics.fields.length; index += 1) {
    expect(metrics.fields[index].top).toBeGreaterThan(
      metrics.fields[index - 1].bottom,
    );
  }
});

test("AUTH-02 validates native signup before Firebase submit", async ({
  page,
}) => {
  await prepareVisualPage({ page, path: "/signup", viewport: "laptop-1366" });
  await page.evaluate(() => document.fonts.ready);
  const signupAlert = page.getByTestId("signup-alert");
  const signupButton = page.getByRole("button", {
    name: "회원가입하고 인증 메일 받기",
  });
  const buttonTopBeforeErrors = await signupButton.evaluate(
    (element) => element.getBoundingClientRect().top + window.scrollY,
  );

  await signupButton.click();
  await expect(signupAlert).toHaveText("입력 내용을 다시 확인해 주세요.");
  await expect(page.getByText("이름을 입력해 주세요.")).toBeVisible();
  await expect(
    page.getByText("서비스 이용약관과 개인정보 처리방침에 동의해 주세요."),
  ).toBeVisible();
  const passwordErrorOrder = await page.evaluate(() => {
    const passwordError = document.querySelector("#signup-password-error");
    const passwordGuidance = document.querySelector(
      "#signup-password-guidance",
    );

    return {
      errorBottom: passwordError?.getBoundingClientRect().bottom ?? 0,
      guidanceTop: passwordGuidance?.getBoundingClientRect().top ?? 0,
    };
  });
  expect(passwordErrorOrder.errorBottom).toBeLessThanOrEqual(
    passwordErrorOrder.guidanceTop,
  );

  const checkboxMetrics = await page.evaluate(() => {
    const termsCheckbox = document.querySelector("#signup-terms");
    const termsControl = termsCheckbox?.closest("div.flex");
    const notificationsCheckbox = document.querySelector(
      "#signup-notifications",
    );
    const notificationsControl = notificationsCheckbox?.closest("div.flex");
    const termsError = document.querySelector("#signup-terms-error");

    return {
      checkboxGap:
        (notificationsControl?.getBoundingClientRect().top ?? 0) -
        (termsControl?.getBoundingClientRect().bottom ?? 0),
      errorGap:
        (termsError?.getBoundingClientRect().top ?? 0) -
        (notificationsControl?.getBoundingClientRect().bottom ?? 0),
    };
  });
  expect(checkboxMetrics.checkboxGap).toBeLessThanOrEqual(14);
  expect(checkboxMetrics.errorGap).toBeGreaterThanOrEqual(11);
  const buttonTopAfterErrors = await signupButton.evaluate(
    (element) => element.getBoundingClientRect().top + window.scrollY,
  );
  expect(
    Math.abs(buttonTopAfterErrors - buttonTopBeforeErrors),
  ).toBeLessThanOrEqual(0.1);

  await expect(page.getByTestId("password-requirement-length")).toHaveAttribute(
    "data-state",
    "unmet",
  );
  await expect(page.getByTestId("password-requirement-number")).toHaveAttribute(
    "data-state",
    "unmet",
  );
  await expect(page.getByTestId("password-guidance")).toBeVisible();
  await expect(page.getByTestId("password-strength")).toHaveAttribute(
    "data-strength",
    "empty",
  );

  await page.getByLabel("이름").fill("김민채");
  await page.getByLabel("이메일", { exact: true }).fill("admin");
  await page.getByRole("combobox", { name: "이메일 도메인 선택" }).click();
  await page.getByRole("option", { name: "gmail.com" }).click();
  await expect(page.getByLabel("이메일", { exact: true })).toHaveValue("admin");
  await expect(
    page.getByRole("combobox", { name: "이메일 도메인 선택" }),
  ).toContainText("gmail.com");
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
  await expect(page.getByTestId("password-strength")).toHaveAttribute(
    "data-strength",
    "medium",
  );
  await signupButton.click();
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
  const signupEmails: string[] = [];

  await page.route(
    /https:\/\/identitytoolkit\.googleapis\.com\/v1\/accounts:(signUp|lookup|update|sendOobCode).*/,
    async (route) => {
      const requestUrl = route.request().url();
      authRequests.push(requestUrl);

      if (requestUrl.includes("accounts:signUp")) {
        const requestBody = route.request().postDataJSON() as {
          email?: string;
        };
        signupEmails.push(requestBody.email ?? "");

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
  await page.getByLabel("이메일", { exact: true }).fill("manager");
  await page.getByRole("combobox", { name: "이메일 도메인 선택" }).click();
  await page.getByRole("option", { name: "직접입력" }).click();
  await expect(page.getByLabel("이메일", { exact: true })).toHaveValue(
    "manager",
  );
  await expect(
    page.getByRole("combobox", { name: "이메일 도메인 선택" }),
  ).toBeVisible();
  await page.getByLabel("이메일 도메인 직접 입력").fill("wee.kr");
  await expect(page.getByLabel("이메일 도메인 직접 입력")).toHaveValue(
    "wee.kr",
  );

  const customDomainMetrics = await page.evaluate(() => {
    const emailControl = document.querySelector(
      '[data-testid="signup-email-control"]',
    );
    const localInput = emailControl?.querySelector("#signup-email");
    const customInput = document.querySelector(
      '[aria-label="이메일 도메인 직접 입력"]',
    );
    const domainTrigger = emailControl?.querySelector(
      '[data-slot="select-trigger"]',
    );
    const domainChevron = domainTrigger?.querySelector("svg");
    const domainTriggerRect = domainTrigger?.getBoundingClientRect();
    const domainChevronRect = domainChevron?.getBoundingClientRect();

    return {
      chevronCenterDeltaX:
        domainTriggerRect && domainChevronRect
          ? Math.abs(
              domainChevronRect.left +
                domainChevronRect.width / 2 -
                (domainTriggerRect.left + domainTriggerRect.width / 2),
            )
          : 0,
      chevronCenterDeltaY:
        domainTriggerRect && domainChevronRect
          ? Math.abs(
              domainChevronRect.top +
                domainChevronRect.height / 2 -
                (domainTriggerRect.top + domainTriggerRect.height / 2),
            )
          : 0,
      customInputTop: customInput?.getBoundingClientRect().top ?? 0,
      domainTriggerWidth: domainTrigger?.getBoundingClientRect().width ?? 0,
      localInputTop: localInput?.getBoundingClientRect().top ?? 0,
    };
  });

  expect(
    Math.abs(
      customDomainMetrics.customInputTop - customDomainMetrics.localInputTop,
    ),
  ).toBeLessThanOrEqual(1);
  expect(customDomainMetrics.domainTriggerWidth).toBeLessThanOrEqual(56);
  expect(customDomainMetrics.chevronCenterDeltaX).toBeLessThanOrEqual(1);
  expect(customDomainMetrics.chevronCenterDeltaY).toBeLessThanOrEqual(1);
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
  expect(signupEmails).toContain("manager@wee.kr");
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

test("ONB screens use user-facing progress", async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/onboarding/workspace",
    viewport: "laptop-1366",
  });
  await page.evaluate(() => document.fonts.ready);

  const progress = page.getByRole("navigation", {
    name: "온보딩 진행 단계",
  });
  await expect(progress).toBeVisible();
  await expect(progress.getByText("소속 만들기")).toBeVisible();
  await expect(progress.getByText("관리자 설정")).toBeVisible();
  const creationProgress = page.getByRole("navigation", {
    name: "소속 생성 세부 단계",
  });
  await expect(creationProgress).toBeVisible();
  await expect(creationProgress.getByText("사업장 정보")).toBeVisible();
  await expect(creationProgress.getByText("요금제 선택")).toBeVisible();
  await expect(creationProgress.getByText("결제 정보")).toBeVisible();
  await expect(creationProgress.getByText("코드 발급")).toBeVisible();
  await expect(
    page.getByTestId("workspace-onboarding-step-workspace-info"),
  ).toBeVisible();
  await expect(page.getByText("ONB-01")).toHaveCount(0);
  await expect(page.getByText("ONB-02")).toHaveCount(0);

  const metrics = await page.evaluate(() => {
    const progressElement = document.querySelector(
      '[data-testid="onboarding-progress"]',
    );
    const heading = document.querySelector("h1");

    return {
      headingTop: heading?.getBoundingClientRect().top ?? 0,
      progressTop: progressElement?.getBoundingClientRect().top ?? 0,
    };
  });

  expect(metrics.progressTop).toBeLessThan(metrics.headingTop);
});

test("ONB-01 validates required workspace information", async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/onboarding/workspace",
    viewport: "laptop-1366",
  });
  await page.evaluate(() => document.fonts.ready);

  await page
    .getByRole("button", { name: "요금제 선택으로 이동" })
    .click();

  await expect(page.getByText("소속 이름을 입력해 주세요.")).toBeVisible();
  await expect(
    page.getByText("사업자등록번호 10자리를 입력해 주세요."),
  ).toBeVisible();
  await expect(page.getByText("대표자명을 입력해 주세요.")).toBeVisible();
  await expect(page.getByText("대표 연락처를 입력해 주세요.")).toBeVisible();
  await expect(
    page.getByTestId("workspace-onboarding-step-workspace-info"),
  ).toBeVisible();
});

test("ONB-01 completes Starter flow without billing", async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/onboarding/workspace",
    viewport: "laptop-1366",
  });
  await page.evaluate(() => document.fonts.ready);

  await fillWorkspaceInformation(page);
  await page
    .getByRole("button", { name: "요금제 선택으로 이동" })
    .click();

  await expect(page.getByTestId("workspace-onboarding-step-plan")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Starter/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );

  await page.getByRole("button", { name: "소속 코드 발급" }).click();

  await expect(page.getByTestId("workspace-onboarding-step-code")).toBeVisible();
  await expect(
    page.getByTestId("workspace-creation-progress").getByText("건너뜀"),
  ).toBeVisible();
  await expect(page.getByText(/^WEE-\d{6}$/).first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: "관리자 설정으로 이동" }),
  ).toHaveAttribute("href", "/onboarding/setup");
  await page.getByRole("link", { name: "관리자 설정으로 이동" }).click();
  await expect(page).toHaveURL(/\/onboarding\/setup$/);
  await expect(page.getByTestId("setup-guide-screen")).toBeVisible();
});

test("ONB-01 requires billing details for Standard flow", async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/onboarding/workspace",
    viewport: "laptop-1366",
  });
  await page.evaluate(() => document.fonts.ready);

  await fillWorkspaceInformation(page);
  await page
    .getByRole("button", { name: "요금제 선택으로 이동" })
    .click();
  await page.getByRole("radio", { name: /Standard/ }).click();
  await expect(page.getByRole("radio", { name: /Standard/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.getByRole("button", { name: "결제 정보 등록" }).click();

  await expect(
    page.getByTestId("workspace-onboarding-step-billing"),
  ).toBeVisible();
  await page.getByRole("button", { name: "결제 정보 저장" }).click();
  await expect(page.getByText("카드번호 16자리를 입력해 주세요.")).toBeVisible();
  await expect(
    page.getByText("유효기간을 MM/YY 형식으로 입력해 주세요."),
  ).toBeVisible();
  await expect(page.getByText("CVC 3자리를 입력해 주세요.")).toBeVisible();
  await expect(page.getByText("카드 소유자명을 입력해 주세요.")).toBeVisible();

  await page.getByLabel("카드번호").fill("4111111111111111");
  await page.getByLabel("유효기간").fill("1229");
  await page.getByLabel("CVC").fill("123");
  await page.getByLabel("카드 소유자명").fill("김민채");
  await page.getByRole("button", { name: "결제 정보 저장" }).click();

  await expect(page.getByTestId("workspace-onboarding-step-code")).toBeVisible();
  await expect(page.getByText("등록 완료")).toBeVisible();
  await expect(page.getByText(/^WEE-\d{6}$/).first()).toBeVisible();
});

test("ONB-02 sends setup tasks to admin interfaces", async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/onboarding/setup",
    viewport: "laptop-1366",
  });
  await page.evaluate(() => document.fonts.ready);

  await expect(page.getByText("ONB-01")).toHaveCount(0);
  await expect(page.getByText("ONB-02")).toHaveCount(0);
  await expect(page.getByText("근무지명")).toHaveCount(0);
  await expect(page.getByText("출퇴근 반경")).toHaveCount(0);
  await expect(page.getByText("근무명")).toHaveCount(0);

  await expect(
    page.getByRole("link", { name: "근무지 관리 열기" }),
  ).toHaveAttribute("href", "/settings/locations");
  await expect(
    page.getByRole("link", { name: "근무 개설 열기" }),
  ).toHaveAttribute("href", "/schedule/duties");
  await expect(page.getByRole("link", { name: "대시보드로 이동" })).toHaveCount(
    0,
  );
});

test("workspace-missing users are forced to workspace creation from admin routes", async ({
  page,
}) => {
  await prepareUnseededPage({
    page,
    path: "/dashboard",
    viewport: "laptop-1366",
  });

  await expect(page).toHaveURL(/\/onboarding\/workspace$/);
  await expect(page.getByTestId("workspace-onboarding-screen")).toBeVisible();
});

test("workspace-missing users cannot open setup guide directly", async ({
  page,
}) => {
  await prepareUnseededPage({
    page,
    path: "/onboarding/setup",
    viewport: "laptop-1366",
  });

  await expect(page).toHaveURL(/\/onboarding\/workspace$/);
  await expect(page.getByTestId("workspace-onboarding-screen")).toBeVisible();
});

async function fillWorkspaceInformation(page: Page) {
  await page.getByLabel("소속 이름").fill("Wee 강남캠퍼스");
  await page.getByLabel("사업자등록번호").fill("1234567890");
  await page.getByLabel("대표자명").fill("김민채");
  await page.getByLabel("대표 연락처").fill("02-1234-5678");
}

async function prepareUnseededPage({
  page,
  path,
  viewport,
}: {
  page: Page;
  path: string;
  viewport: "desktop-1920" | "laptop-1366";
}) {
  await page.setViewportSize(
    viewport === "desktop-1920"
      ? { width: 1920, height: 1080 }
      : { width: 1366, height: 768 },
  );

  const url = new URL(
    path,
    process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100",
  );
  await page.goto(url.toString(), { waitUntil: "networkidle" });
}
