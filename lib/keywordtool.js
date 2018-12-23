const config = require("../config/config");
const path = require("path");
const helper = require("../lib/helper");
const get = require("lodash.get");
const fs = require('fs');
const fsp = require('promise-fs');
const {promisify} = require("es6-promisify");
const md5File = require('md5-file');
const md5p = promisify(md5File);
const axios = require('axios');

module.exports.getResults = async function(keyword) {
  const md5 = await md5p(path.join(helper.curDir(), "/config/keywords.csv"));
  const resultFile = path.join(helper.curDir(), `keywordtool_${md5}.json`);
  const isExist = fs.existsSync(resultFile);
  if (!isExist) {
    const response = await axios.post('https://api.keywordtool.io/v2/search/volume/amazon', {
      apikey: 'INSERT KEYWORDTOOL API KEY HERE',
      keyword,
      metrics_currency: 'USD',
      output: 'json'
    });
    fs.writeFileSync(resultFile, JSON.stringify(response.data), 'utf8');
    return response.results;
  }

  const resultString = await fsp.readFile(resultFile, 'utf8');
  return (JSON.parse(resultString)).results;
}

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
