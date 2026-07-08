const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    const errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
        }
    });

    try {
        console.log('Navigating to http://localhost:8000 ...');
        await page.goto('http://localhost:8000', { waitUntil: 'networkidle' });

        // Let it render for a couple of seconds to see if anything breaks
        await page.waitForTimeout(2000);

        if (errors.length > 0) {
            console.error('Console errors found:', errors);
        } else {
            console.log('No console errors found!');
        }

        await page.screenshot({ path: 'screenshot.png' });
        console.log('Screenshot saved to screenshot.png');
    } catch (e) {
        console.error('Playwright script error:', e);
    } finally {
        await browser.close();
    }
})();
