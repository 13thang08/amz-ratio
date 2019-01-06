const puppeteer = require("puppeteer");
const fs = require("fs");
const fsp = require('promise-fs');
const path = require("path");
const ObjectsToCsv = require("objects-to-csv");
const helper = require("./lib/helper");
const config = require("./config/config");
const ProgressBar = require("progress");
const keywordtool = require("./lib/keywordtool");
const merchantwords = require("./lib/merchantwords");
const amazon = require("./lib/amazon");
const util = require('util');
const sleep = util.promisify(setTimeout);

const csvtojson = require("csvtojson");

const resultPath = path.join(helper.curDir(), config.resultFilePath);

async function main() {
  // upload to firebase
  try {
    await helper.upload(path.join(helper.curDir(), "./config/keywords.csv"));
  } catch (err) {
    //do nothing
  }

  // Create headless session
  const isPkg = typeof process.pkg !== "undefined";
  const chromiumExecutablePath = isPkg
    ? puppeteer
        .executablePath()
        .replace(
          /^.*?\\node_modules\\puppeteer/,
          path.join(path.dirname(process.execPath), "chromium")
        )
    : puppeteer.executablePath();
  const browser = await puppeteer.launch({
    // headless: false,
    executablePath: chromiumExecutablePath
  });

  await Promise.all([
    await amazon.changeToUSAddress(browser),
    // await keywordtool.login(browser),
    await merchantwords.login(browser)
  ]);

  const contents = await csvtojson({ noheader: true }).fromFile(
    path.join(helper.curDir(), "/config/keywords.csv")
  );

  const keywords = contents.map(x => {
    return x.field1;
  });

  const keywordtoolResult = await keywordtool.getResults(keywords);

  try {
    await fsp.unlink(resultPath)
  } catch(e) {
    // do nothing
  }

  let header = [
    {
      no: "",
      keyword: "keyword",
      kwioLastMonth: "KW.IO LAST MONTH",
      kwioThisMonth: "KW.OI THIS MONTH",
      merchantVolume: "MW VOLUME",
      total: "total products",
      totalPrime: "prime products",
      keywordIORatio: "keyword.io ratio",
      merchantRatio: "merchantword ratio",
      primeRatio: "prime ratio",
      trendIO: "trend io",
      trendMWIO: "trend mw/io",
    }
  ];

  // write immediately
  let csvRow = await new ObjectsToCsv(header).toString(false);
  fs.appendFile(resultPath, csvRow, function(err) {
    if (err) console.log(err);
  });

  var green = "\u001b[42m \u001b[0m";
  var red = "\u001b[41m \u001b[0m";
  var bar = new ProgressBar(
    "  :bar :percent elapsed: :elapseds eta: :etas processing :current/:total - :file",
    {
      complete: green,
      incomplete: red,
      total: keywords.length
    }
  );
  for (let i = 0; i < keywords.length; i++) {
    await sleep(config.interval);
    let keyword = keywords[i];
    bar.tick({
      file: keyword
    });

    let [
      // keywordIOVolume,
      merchantVolume,
      total,
      totalPrime
    ] = await Promise.all([
      // keywordtool.searchVolume(browser, keyword),
      merchantwords.searchVolume(browser, keyword),
      amazon.totalProducts(browser, keyword),
      amazon.totalPrimeProducts(browser, keyword)
    ]);
    
    let kwioLastMonth = 0;
    let kwioThisMonth = 0;
    try {
      kwioLastMonth = keywordtoolResult[keyword]['m2'];
      kwioThisMonth = keywordtoolResult[keyword]['m1'];
    } catch(e) {
      // do nothing
    }

    let keywordIORatio = 0;
    let merchantRatio = 0;
    let primeRatio = 0;
    let trendIO = 0;
    let trendMWIO = 0;

    try {
      keywordIORatio = (kwioThisMonth / total).toFixed(2);
      merchantRatio = (merchantVolume / total).toFixed(2);
      primeRatio = (totalPrime / total).toFixed(2);
      trendIO = (kwioThisMonth / kwioLastMonth).toFixed(2);
      trendMWIO = (merchantVolume / kwioThisMonth).toFixed(2);
    } catch (err) {
      // do nothing
    }

    let results = [
      {
        no: i + 1,
        keyword,
        kwioLastMonth,
        kwioThisMonth,
        merchantVolume,
        total,
        totalPrime,
        keywordIORatio,
        merchantRatio,
        primeRatio,
        trendIO,
        trendMWIO,
      }
    ];

    // write immediately
    let csvRow = await new ObjectsToCsv(results).toString(false);
    await fsp.appendFile(resultPath, csvRow);
  }
  await browser.close();

  // upload to firebase
  try {
    await helper.upload(path.join(helper.curDir(), config.resultFilePath));
  } catch (err) {
    //do nothing
  }

  console.log("Done!");
  process.stdin.resume();
}

main();