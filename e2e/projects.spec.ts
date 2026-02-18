import { expect, test } from "@playwright/test";
import { createProject, waitForPreviewData } from "./utils";

test.describe("Projects", () => {
  test("create project and view preview", async ({ page }) => {
    const projectName = `E2E Project ${Date.now()}`;

    await page.goto("/projects");
    await page.getByRole("heading", { name: "Projects" }).waitFor();
    await page.getByRole("link", { name: /new project/i }).click();
    await createProject(page, projectName, { skipNavigation: true });

    await waitForPreviewData(page);
  });

  test("project appears in list", async ({ page }) => {
    const projectName = `E2E Listed Project ${Date.now()}`;

    await createProject(page, projectName);
    await page.goto("/projects");
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 30000 });
  });
});
