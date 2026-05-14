import { expect, test, type Locator, type Page } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const desktop: VisualViewportName = "desktop-1920";
const laptop: VisualViewportName = "laptop-1366";
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
    const table = page.getByTestId("settings-locations-table");

    await expect(screen).toBeVisible();
    await expect(screen).toContainText("근무지 추가");
    await expect(table).toBeVisible();
    await expect(table.locator('[role="columnheader"]')).toHaveText([
      "근무지",
      "주소",
      "허용 반경",
      "사용 근무",
      "상세",
    ]);
    await expect(table).not.toContainText("좌표 확인");

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
  await expect(dialog.getByLabel("주소")).toBeEditable();
  await expect(dialog).toHaveCSS("transform", "none");

  const radiusInput = dialog.getByRole("spinbutton", {
    name: "출퇴근 허용 반경",
  });
  await expect(radiusInput).toHaveAttribute("type", "number");
  await expect(radiusInput).toHaveValue("100");
  await expectControlHeight(dialog.getByLabel("근무지 이름"), 44);
  await expectControlHeight(dialog.locator('[data-slot="search-field"]'), 44);
  await expectControlHeight(radiusInput, 44);
  await expect(dialog.locator("#settings-location-radius-unit")).toHaveText(
    "m",
  );

  await captureActualScreenshot({
    page,
    screenId: "SET-02",
    state: "location-dialog",
    viewport: desktop,
  });
});

test(`SET-02 location-dialog fits viewport ${laptop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/settings/locations",
    viewport: laptop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("settings-locations-add-trigger").click();

  await expectDialogWithinViewport(page, "settings-location-dialog");
});

test("SET-02 creates, edits, and deletes location through Firestore", async ({
  page,
}) => {
  const suffix = Date.now().toString().slice(-6);
  const locationName = `마포 D 학원 ${suffix}`;
  const editedLocationName = `마포 D 수정 ${suffix}`;

  await prepareVisualPage({
    page,
    path: "/settings/locations",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("settings-locations-add-trigger").click();

  const dialog = page.getByTestId("settings-location-dialog");
  await dialog.getByLabel("근무지 이름").fill(locationName);
  await dialog.getByLabel("주소").fill("서울 마포구 양화로 45");
  await page.getByTestId("settings-location-address-result").first().click();
  await expect(dialog.getByRole("button", { name: "저장" })).toBeEnabled({
    timeout: 10000,
  });
  await dialog.getByLabel("주소").press("Enter");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("spinbutton", { name: "출퇴근 허용 반경" }).fill("90");
  await dialog.getByRole("button", { name: "저장" }).click();

  await expect(dialog).toBeHidden();

  const screen = page.getByTestId("settings-locations-screen");
  await expect(screen).toContainText(locationName);
  await expect(screen).toContainText("서울 마포구 양화로 45");
  await expect(screen).toContainText("90m");
  await expect(screen).toContainText(`${locationName} 근무지를 등록했습니다.`);

  await page
    .getByTestId("settings-locations-first-row")
    .getByRole("button", { name: "수정" })
    .click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("근무지 수정");
  await expect(dialog.getByRole("button", { name: "수정" })).toBeEnabled({
    timeout: 10000,
  });
  await dialog.getByLabel("근무지 이름").fill(editedLocationName);
  await dialog
    .getByRole("spinbutton", { name: "출퇴근 허용 반경" })
    .fill("110");
  await dialog.getByRole("button", { name: "수정" }).click();

  await expect(dialog).toBeHidden();
  await expect(screen).toContainText(editedLocationName);
  await expect(screen).toContainText("110m");
  await expect(screen).toContainText(
    `${editedLocationName} 근무지를 수정했습니다.`,
  );

  await page
    .getByTestId("settings-locations-first-row")
    .getByRole("button", { name: "삭제" })
    .click();
  await page.getByRole("dialog").getByRole("button", { name: "삭제" }).click();
  await expect(screen).toContainText(
    `${editedLocationName} 근무지를 삭제했습니다.`,
  );
  await expect(
    page.getByTestId("settings-locations-table").getByText(editedLocationName),
  ).toHaveCount(0);
});

async function expectDialogWithinViewport(page: Page, testId: string) {
  const dialog = page.getByTestId(testId);
  await expect(dialog).toBeVisible();

  const box = await dialog.boundingBox();
  const viewport = page.viewportSize();

  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();

  if (!box || !viewport) {
    return;
  }

  const verticalInset = 24;
  expect(box.y).toBeGreaterThanOrEqual(verticalInset - 1);
  expect(box.y + box.height).toBeLessThanOrEqual(
    viewport.height - verticalInset + 1,
  );
}

async function expectControlHeight(locator: Locator, expectedHeight: number) {
  const box = await locator.boundingBox();

  expect(box).not.toBeNull();
  expect(Math.round(box?.height ?? 0)).toBe(expectedHeight);
}
