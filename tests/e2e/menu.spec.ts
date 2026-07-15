import { expect, test } from "@playwright/test";

test("public demo menu opens and switches language", async ({ page }) => {
  await page.goto("/demo/menu");
  await expect(page.getByRole("button", { name: "Select language" })).toBeVisible();

  await page.getByRole("button", { name: "Select language" }).click();
  await page.getByRole("menuitemradio", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

  await page.getByRole("button", { name: "Select language" }).click();
  await page.getByRole("menuitemradio", { name: "العربية" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});

test("legacy /menu redirects to the demo menu", async ({ page }) => {
  await page.goto("/menu");
  await expect(page).toHaveURL(/\/demo\/menu$/);
});
