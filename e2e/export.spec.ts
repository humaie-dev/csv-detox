import { expect, test } from "@playwright/test";
import { createProject, waitForPreviewData } from "./utils";

test.describe("Export", () => {
  test("export all downloads a zip", async ({ page }) => {
    const projectName = `E2E Export Project ${Date.now()}`;

    await createProject(page, projectName);
    await waitForPreviewData(page);

    await page.getByRole("button", { name: /create one/i }).click();
    await page.getByLabel("Pipeline Name").fill(`Export Pipeline ${Date.now()}`);
    await page.getByRole("button", { name: "Save" }).click();

    await page.getByRole("button", { name: /add step/i }).click();
    await page.getByLabel("Operation Type").click();
    await page.getByRole("option", { name: /trim whitespace/i }).click();
    await page.getByRole("dialog").getByText("name").click();
    await page.getByRole("button", { name: "Add Step" }).click();

    const exportAllButton = page.getByRole("button", { name: /export all/i });
    await expect(exportAllButton).toBeVisible({ timeout: 30000 });
    await expect(exportAllButton).toBeEnabled({ timeout: 30000 });
    const downloadPromise = page.waitForEvent("download");
    await exportAllButton.click();
    const download = await downloadPromise;

    const fileName = download.suggestedFilename();
    expect(fileName).toMatch(/\.zip$/i);
  });
});
