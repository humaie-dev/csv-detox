import { expect, test } from "@playwright/test";
import { createProject, waitForPreviewData } from "./utils";

test.describe("Pipelines", () => {
  test("create pipeline and add trim step", async ({ page }) => {
    const projectName = `E2E Pipeline Project ${Date.now()}`;
    const pipelineName = `Clean ${Date.now()}`;

    await createProject(page, projectName);
    await waitForPreviewData(page);

    await page.getByRole("button", { name: /create one/i }).click();
    await page.getByLabel("Pipeline Name").fill(pipelineName);
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("button", { name: pipelineName })).toBeVisible({
      timeout: 30000,
    });

    await page.getByRole("button", { name: /add step/i }).click();
    await page.getByLabel("Operation Type").click();
    await page.getByRole("option", { name: /trim whitespace/i }).click();
    await page.getByRole("dialog").getByText("name").click();
    await page.getByRole("button", { name: "Add Step" }).click();

    await expect(page.getByText("trim", { exact: true })).toBeVisible({ timeout: 30000 });
  });

  test("delete pipeline from selected pipeline actions", async ({ page }) => {
    const projectName = `E2E Pipeline Delete Project ${Date.now()}`;
    const pipelineName = `Delete Me ${Date.now()}`;

    await createProject(page, projectName);
    await waitForPreviewData(page);

    await page.getByRole("button", { name: /create one/i }).click();
    await page.getByLabel("Pipeline Name").fill(pipelineName);
    await page.getByRole("button", { name: "Save" }).click();

    const pipelineCard = page
      .locator("button")
      .filter({ has: page.locator("span", { hasText: pipelineName }) });
    await expect(pipelineCard).toBeVisible({ timeout: 30000 });
    await pipelineCard.click();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: `Delete pipeline ${pipelineName}` }).click();

    await expect(pipelineCard).toHaveCount(0, {
      timeout: 30000,
    });
    await expect(page.getByText("Select a pipeline to view steps")).toBeVisible();
  });
});
