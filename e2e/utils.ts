import { expect, type Page } from "@playwright/test";

const testFilePath = "e2e/fixtures/simple.csv";

export const fixtures = {
  simpleCsv: testFilePath,
};

export function getProjectIdFromUrl(page: Page): string {
  const match = page.url().match(/\/projects\/([^/]+)$/);
  if (!match) {
    throw new Error(`Unable to determine project id from URL: ${page.url()}`);
  }
  return match[1];
}

export async function createProject(
  page: Page,
  projectName: string,
  options?: { skipNavigation?: boolean },
) {
  if (!options?.skipNavigation) {
    await page.goto("/projects/new");
  }
  await page.getByLabel("Project Name").waitFor();
  await page.getByLabel("Project Name").fill(projectName);
  await page.locator('input[type="file"]').setInputFiles(testFilePath);
  await page.getByRole("button", { name: "Create Project" }).click();

  await page.waitForURL(/\/projects\//);
  await expect(page.getByText("Loading project...")).toBeHidden({ timeout: 30000 });
  await expect(page.getByRole("heading", { name: projectName })).toBeVisible({
    timeout: 30000,
  });
}

export async function parseProjectData(page: Page) {
  const projectId = getProjectIdFromUrl(page);
  const response = await page.request.post(`/api/projects/${projectId}/parse`, {
    data: {},
  });
  expect(response.ok()).toBe(true);
}

export async function waitForPreviewData(page: Page) {
  const projectId = getProjectIdFromUrl(page);
  const parseResponse = await page.request.post(`/api/projects/${projectId}/parse`, {
    data: {},
  });
  expect(parseResponse.ok()).toBe(true);
  await page.reload();
  await expect(page.getByText("Parsing file...")).toBeHidden({ timeout: 60000 });
  await expect(page.getByText("Loading preview...")).toBeHidden({ timeout: 60000 });
  await expect(page.getByText("Data Preview", { exact: true })).toBeVisible({
    timeout: 60000,
  });
  await expect(page.getByRole("table")).toBeVisible({ timeout: 60000 });
  await expect(page.getByText(/rows\s×\s\d+\scolumns/i)).toBeVisible({
    timeout: 60000,
  });
}
