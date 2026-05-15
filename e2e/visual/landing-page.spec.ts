import { expect, test } from "playwright/test";
import { captureActualScreenshot, prepareVisualPage } from "./helpers";

for (const viewport of ["desktop-1920", "desktop-1400", "laptop-1366"] as const) {
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
    await expect(page.getByText("잦은 변수로 관리가 어렵습니다")).toBeVisible();
    await expect(page.getByText("정산보다 검토가 더 오래 걸립니다")).toBeVisible();
    await expect(page.getByText("인수인계가 사람마다 달라집니다")).toBeVisible();
    await expect(page.getByText("시간표 연동 자동 근무 기록")).toBeVisible();
    await expect(page.getByText("예외만 빠르게 확인하는 승인 워크플로우")).toBeVisible();
    await expect(page.getByText("승인된 기록 기반 급여 자동 산정")).toBeVisible();
    await expect(page.getByText("AI 인수인계 자동 문서화")).toBeVisible();
    await expect(page.getByText("운영 노하우까지 쌓이는 AI 시스템")).toBeVisible();
    await expect(page.getByText("메신저에 흩어진 운영 노하우를 조직의 자산으로 바꿉니다")).toBeVisible();
    await expect(page.getByText("바로 시작하는 운영 플로우")).toBeVisible();
    await expect(page.getByText("Wee를 도입하면")).toBeVisible();
    await expect(page.getByText("운영 규모에 맞게 선택하는")).toBeVisible();
    await expect(page.getByText("기존 서비스(시프티, 알밤)와 뭐가 다른가요?")).toBeVisible();
    await expect(page.getByText("출강 학원이 여러 개여도 되나요?")).toBeVisible();
    await expect(page.getByText("추천")).toHaveCount(0);
    await expect(page.getByTestId("landing-section-hero")).toBeVisible();
    await expect(page.getByTestId("landing-section-problem")).toBeVisible();
    await expect(page.getByTestId("landing-section-features")).toBeVisible();
    await expect(page.getByTestId("landing-section-ai")).toBeVisible();
    await expect(page.getByTestId("landing-section-setup")).toBeVisible();
    await expect(page.getByTestId("landing-section-help")).toBeVisible();
    await expect(page.getByTestId("landing-section-pricing")).toBeVisible();
    await expect(page.getByTestId("landing-section-faq")).toBeVisible();
    const headerBox = await page.locator("header > div").boundingBox();
    expect(headerBox).not.toBeNull();
    expect(headerBox!.width).toBeLessThanOrEqual(1201);
    expect(headerBox!.x).toBeGreaterThanOrEqual(80);
    await expect(page.getByTestId("feature-mockup")).toHaveCount(4);
    await expect(page.getByTestId("problem-card-image")).toHaveCount(3);
    await expect(page.getByTestId("ai-benefit-image")).toHaveCount(3);
    await expect(page.getByRole("img", { name: "Wee 관리자 대시보드" }).first()).toBeVisible();
    await expect(page.getByRole("img", { name: "시간표 연동 자동 근무 기록 화면" })).toBeVisible();
    await expect(page.getByRole("img", { name: "근무 타임라인 승인 워크플로우 화면" })).toBeVisible();
    await expect(page.getByRole("img", { name: "급여 자동 산정 화면" })).toBeVisible();
    await expect(page.getByRole("img", { name: "AI 인수인계 자동 문서화 화면" })).toBeVisible();
    await expect(page.getByRole("img", { name: "운영 플로우 미리보기 화면" })).toBeVisible();

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
