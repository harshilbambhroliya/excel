import { test, expect } from "@playwright/test";

test("test", async ({ page }) => {
    await page.goto("http://localhost:5173/");
    await page.locator("#excelCanvas").click({
        position: {
            x: 84,
            y: 50,
        },
    });
    await page.locator("#excelCanvas").dblclick({
        position: {
            x: 100,
            y: 47,
        },
    });
    await page.getByRole("textbox").nth(1).fill("Harshil");
    await page.getByRole("textbox").nth(1).press("Enter");
    await page.locator("#excelCanvas").click({
        position: {
            x: 89,
            y: 75,
        },
    });
    await page.locator("#excelCanvas").click({
        position: {
            x: 252,
            y: 170,
        },
    });
    await page.getByRole("button", { name: "Load Sample Data" }).click();
    await page.locator("#excelCanvas").click({
        position: {
            x: 375,
            y: 109,
        },
    });
    await page.locator("#excelCanvas").click({
        position: {
            x: 418,
            y: 18,
        },
    });
});
