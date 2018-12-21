const helper = require("../lib/helper");
const fs = require("fs");
const path = require("path");

module.exports.login = async function(browser) {
  const page = await browser.newPage();
  const merchantWordsCookies = JSON.parse(
    fs.readFileSync(
      path.join(helper.curDir(), "/config/merchantwords-cookies.json"),
      "utf8"
    )
  );
  await page.setCookie(...merchantWordsCookies);
  await page.close();
};

module.exports.searchVolume = async function(browser, keyword) {
  const page = await browser.newPage();
  let url = encodeURI(
    `https://www.merchantwords.com/search/us/${keyword}/sort-highest`
  );

  await page.goto(url);
  let result = await page.evaluate(() => {
    const txt = $('[data-title="Amazon Search Volume"]').html();
    if (txt) {
      return txt.replace(/,/g, "");
    } else {
      return 0;
    }
  });

  await page.close();
  return result;
};
