import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const desktop: VisualViewportName = "desktop-1920";
const runFirestoreVisuals = process.env.WEE_RUN_FIRESTORE_VISUALS === "1";

test.skip(
  !runFirestoreVisuals,
  "SET-02 uses live Firestore writes; set WEE_RUN_FIRESTORE_VISUALS=1 with a test Firebase project to run.",
);

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`SET-02 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({
      page,
      path: "/settings/locations",
      viewport,
    });
    await page.evaluate(() => document.fonts.ready);

    const screen = page.getByTestId("settings-locations-screen");
    await expect(screen).toBeVisible();
    await expect(screen).toContainText("근무지 추가");
    await expect(page.getByTestId("settings-locations-table")).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "SET-02",
      viewport,
    });
  });
}

test(`SET-02 location-dialog ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/settings/locations",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("settings-locations-add-trigger").click();

  const dialog = page.getByTestId("settings-location-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("근무지 추가");
  await expect(dialog).toContainText("출퇴근 허용 반경");
  await expect(page.getByTestId("settings-location-map")).toBeVisible();
  await expect(dialog.getByLabel("근무지 이름")).toBeEditable();
  await expect(dialog.getByLabel("도로명 주소")).toBeEditable();

  const radiusInput = dialog.getByRole("spinbutton", {
    name: "출퇴근 허용 반경",
  });
  await expect(radiusInput).toHaveAttribute("type", "number");
  await expect(radiusInput).toHaveValue("100");
  await expect(dialog.locator("#settings-location-radius-unit")).toHaveText("m");

  await captureActualScreenshot({
    page,
    screenId: "SET-02",
    state: "location-dialog",
    viewport: desktop,
  });
});

test("SET-02 creates location through Firestore", async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/settings/locations",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("settings-locations-add-trigger").click();

  const dialog = page.getByTestId("settings-location-dialog");
  await dialog.getByLabel("근무지 이름").fill("마포 D 학원");
  await dialog.getByLabel("도로명 주소").fill("서울 마포구 양화로 45");
  await dialog.getByLabel("상세 주소").fill("4층");
  await dialog
    .getByRole("spinbutton", { name: "출퇴근 허용 반경" })
    .fill("90");
  await dialog.getByRole("button", { name: "근무지 저장" }).click();

  await expect(dialog).toBeHidden();

  const screen = page.getByTestId("settings-locations-screen");
  await expect(screen).toContainText("마포 D 학원");
  await expect(screen).toContainText("서울 마포구 양화로 45 4층");
  await expect(screen).toContainText("90m");
  await expect(screen).toContainText("좌표 확인");
  await expect(screen).toContainText("마포 D 학원 근무지를 등록했습니다.");
});
