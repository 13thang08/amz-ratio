const config = require("../config/config");
const get = require("lodash.get");

module.exports.login = async function(browser) {
  const page = await browser.newPage();

  await page.goto("https://keywordtool.io/user");
  await page.focus("#edit-name");
  await page.keyboard.type(config.keywordtool.username);
  await page.focus("#edit-pass");
  await page.keyboard.type(config.keywordtool.password);
  await page.click("#edit-submit");
  await page.waitForNavigation();
  await page.close();
};

module.exports.searchVolume = async function(browser, keyword) {
  const page = await browser.newPage();

  let promise = new Promise(async function(resolve, reject) {
    page.on("response", async function(response) {
      if (response.url() === "https://keywordtool.io/system/ajax") {
        const arr = await response.json();
        for (const element of arr) {
          let monthData = get(
            element,
            "settings.ktKeywords.targetedMonthlySearches"
          );
          if (monthData) {
            try {
              const data = monthData[Object.keys(monthData)[0]].data;
              resolve({
                thisMonth: data[data.length - 1],
                lastMonth: data[data.length - 2]
              });
            } catch (e) {
              resolve({
                currentMonth: 0,
                previousMont: 0
              });
            }
          }
        }
      }
    });
  });

  // timeout
  let timeout = new Promise((resolve, reject) => {
    let wait = setTimeout(() => {
      clearTimeout(wait);
      resolve(0);
    }, 30000);
  });

  await page.goto("https://keywordtool.io/amazon");
  await page.evaluate(keyword => {
    document.querySelector("#edit-category").value = "aps";
    document.querySelector("#edit-country-language").value = "US:en_US";
    document.querySelector("#edit-keyword").value = keyword;
    document.querySelector("#edit-submit").click();
  }, keyword);

  let result = await Promise.race([promise, timeout]);
  await page.close();
  return result;
};
