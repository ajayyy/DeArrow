import { Builder, By, until, WebDriver } from "selenium-webdriver";
import * as Chrome from "selenium-webdriver/chrome";
import * as Path from "path";

import * as fs from "fs";

test("Selenium Chrome test", async () => {
    let driver: WebDriver;
    try {
        driver = await setup();   
    } catch (e) {
        console.warn("A browser is probably not installed, skipping selenium tests");
        console.warn(e);

        return;
    }

    try {
        await waitForInstall(driver);
        // This video has no ads
        await goToVideo(driver, "QjjpDhHh_QI");

        await checkTitle(driver, "Demo of DeArrow - A Browser Extension for Crowdsourcing Better Titles and Thumbnails on YouTube");
    } catch (e) {
        // Save file incase there is a layout change
        const source = await driver.getPageSource();

        if (!fs.existsSync("./test-results")) fs.mkdirSync("./test-results"); 
        fs.writeFileSync("./test-results/source.html", source);
        
        throw e;
    } finally {
        await driver.quit();
    }
}, 100_000);

async function setup(): Promise<WebDriver> {
    const options = new Chrome.Options();
    options.addArguments("--load-extension=" + Path.join(__dirname, "../dist/"));
    options.addArguments("--mute-audio");
    options.addArguments("--disable-features=PreloadMediaEngagementData, MediaEngagementBypassAutoplayPolicies");
    options.addArguments("--headless=new");
    options.addArguments("--window-size=1920,1080");

    const driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
    driver.manage().setTimeouts({
        implicit: 5000
    });

    return driver;
}

async function waitForInstall(driver: WebDriver, startingTab = 0): Promise<void> {
    // Selenium only knows about the one tab it's on,
    // so we can't wait for the help page to appear
    await driver.sleep(3000);

    const handles = await driver.getAllWindowHandles();
    await driver.switchTo().window(handles[startingTab]);
}

async function goToVideo(driver: WebDriver, videoId: string): Promise<void> {
    await driver.get("https://www.youtube.com/watch?v=" + videoId);
    await driver.wait(until.elementIsVisible(await driver.findElement(By.css(".ytd-video-primary-info-renderer, #above-the-fold"))));
}

async function checkTitle(driver: WebDriver, expectedTitle: string): Promise<void> {
    const title = await driver.findElement(By.css("#above-the-fold #title .cbCustomTitle"));
    const titleText = await title.getText();
    expect(titleText).toContain(expectedTitle);
}