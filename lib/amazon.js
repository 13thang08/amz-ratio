module.exports.changeToUSAddress = async function(browser) {
  const page = await browser.newPage();
  let url = encodeURI(`https://www.amazon.com/`);

  await page.goto(url);

  await page.addScriptTag({
    url: "https://code.jquery.com/jquery-3.2.1.min.js"
  });

  let result = await page.evaluate(async () => {
    await $.ajax({
      url: "https://www.amazon.com/gp/delivery/ajax/address-change.html",
      type: "POST",
      data: {
        locationType: "LOCATION_INPUT",
        zipCode: "33023",
        storeContext: "gateway",
        deviceType: "web",
        pageType: "Search",
        actionSource: "glow"
      }
    });
  });

  await page.close();
  return result;
};

module.exports.totalPrimeProducts = async function(browser, keyword) {
  const page = await browser.newPage();
  let url = encodeURI(
    `https://www.amazon.com/s/s/ref=glow_cls?rh=i:aps,k:ipx,p_85:2470955011&keywords=${keyword}`
  );

  await page.goto(url);
  let result = await page.evaluate(() => {
    const resultText = document.querySelector("#s-result-count");
    const parts =
      resultText && resultText.textContent.match(/([0-9.,]+) results/);
    const count = parts && parts[1];

    if (count) {
      return count.replace(/,/g, "");
    } else {
      return 0;
    }
  });

  await page.close();
  return result;
};

module.exports.totalProducts = async function (browser, keyword) {
  const page = await browser.newPage();
  let url = encodeURI(`https://www.amazon.com/s/field-keywords=${keyword}`);

  await page.goto(url);
  let result = await page.evaluate(() => {
    const resultText = document.querySelector("#s-result-count");
    const parts =
      resultText && resultText.textContent.match(/([0-9.,]+) results/);
    const count = parts && parts[1];

    if (count) {
      return count.replace(/,/g, "");
    } else {
      return 0;
    }
  });

  await page.close();
  return result;
}