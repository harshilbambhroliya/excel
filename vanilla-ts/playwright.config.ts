import { defineConfig } from "@playwright/test";

export default defineConfig({
    reporter: [["html"]], // enables the HTML report
});
