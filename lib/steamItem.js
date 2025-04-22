'use strict';

const { request } = require('undici');
const path = require('node:path');
const fsp = require('node:fs/promises');

class SteamItem {
  firstUrl =
    'https://steamcommunity.com/market/itemordershistogram?country=DE&language=english&currency=5&item_nameid=';

  activeProxy = null;
  lastGraph = null;
  critPoint = 15;

  constructor(props) {
    const { name, float, price, sleep: delay, sendTgMessage } = props;
    const { id, proxiesOne, proxiesTwo, console, getAccount } = props;
    const floats = float.split(';');
    const prices = price.split(';');
    this.floatPrices = {};
    for (let i = 0; i < floats.length; i++) {
      if (!prices[i] || !floats[i]) process.exit('Float and price mismatch');
      const [min, max] = prices[i].split('-');
      this.floatPrices[floats[i]] = {
        min: Number(min),
        max: Number(max),
      };
    }
    this.sendTgMessage = sendTgMessage;
    this.nameDec = name
      .replaceAll(/\s/g, '%20')
      .replaceAll(/\|/g, '%7C')
      .replaceAll(/\(/g, '%28')
      .replaceAll(/\)/g, '%29');
    this.currencyIdx = 5;
    this.fileName = name.replaceAll(/\|/g, '');
    this.console = console(this.fileName);
    this.name = name;
    this.delay = delay;
    this.id = id;
    this.getAccount = getAccount;
    this.proxiesOne = proxiesOne;
    this.proxiesTwo = proxiesTwo;
    this.secondUrl = `https://steamcommunity.com/market/listings/730/${this.nameDec}/render/?query=&start=0&count=10&country=DE&language=english&currency=5`;
    this.floatUrl = 'http://109.107.157.72:80/?url=';
    this.buyUrl = 'https://steamcommunity.com/market/buylisting/';
    this.stepTwoTries = 10;
  }

  analyzeGraph(graph) {
    if (!graph) return null;
    const res = {};
    const logsGraph = [];
    for (let i = 0; i < graph.length; i++) {
      logsGraph.push(graph[i]);
      const prevItem = graph[i - 1] || [0, 0, ''];
      const currItem = graph[i];
      if (currItem[1] >= this.critPoint) {
        const count = this.critPoint - prevItem[1];
        res[currItem[0]] = count;
        this.console.log({ logsGraph });
        return res;
      }
      const count = currItem[1] - prevItem[1];
      res[currItem[0]] = count;
    }
    this.console.log({ logsGraph });
    return res;
  }

  async compareGraph(graph) {
    if (!this.lastGraph) {
      this.lastGraph = graph;
      return await this.stepTwo();
    }
    const prevGraph = this.lastGraph;
    this.lastGraph = graph;
    const maxLevelNew = Math.max(...Object.keys(graph));
    const maxLevelOld = Math.max(...Object.keys(prevGraph));
    this.console.log({
      name: this.name,
      new: { [maxLevelNew]: graph[maxLevelNew] },
      prev: {
        [maxLevelOld]: prevGraph[maxLevelOld],
      },
    });

    if (
      maxLevelNew > maxLevelOld ||
      (maxLevelNew === maxLevelOld &&
        graph[maxLevelNew] > prevGraph[maxLevelOld])
    ) {
      return null;
    }
    if (
      graph[maxLevelNew] < prevGraph[maxLevelOld] ||
      maxLevelNew < maxLevelOld
    ) {
      return await this.stepTwo();
    }
    return null;
  }

  async stepOne() {
    setInterval(async () => {
      const apiUrl = this.firstUrl + this.id;
      const proxy = this.proxiesOne.getProxy(this.activeProxy);
      this.activeProxy = proxy.id;
      try {
        const { body } = await request(apiUrl, {
          method: 'GET',
          headers: {
            Cookie: proxy.cookie,
          },
          dispatcher: proxy.agent,
        });
        const data = await body.json();

        this.proxiesOne.resetProxy(proxy.id);
        this.activeProxy = null;
        if (!data) return;
        const graph = data.sell_order_graph;
        const analyzedGraph = this.analyzeGraph(graph);
        // this.console.log(analyzedGraph);
        await this.compareGraph(analyzedGraph);
      } catch (error) {
        this.proxiesOne.resetProxy(proxy.id);
        console.log('Error step 1: ' + proxy.id + error);
      }
    }, this.delay * 1000);
  }

  async stepTwo() {
    this.console.log('STEP 2: ' + this.name);
    const proxy = this.proxiesTwo.getProxy(this.activeProxy);
    this.activeProxy = proxy.id;
    try {
      const { body, statusCode } = await request(this.secondUrl, {
        method: 'GET',
        headers: {
          Cookie: proxy.cookie,
        },
        dispatcher: proxy.agent,
      });
      this.proxiesTwo.resetProxy(proxy.id);
      this.activeProxy = null;
      if (statusCode !== 200) return await this.stepTwo();
      const data = await body.json();
      if (!data.success) {
        this.stepTwoTries--;
        if (this.stepTwoTries > 0) return await this.stepTwo();
        this.stepTwoTries = 10;
        return null;
      }

      const productsPath = path.join(
        process.cwd(),
        'static/products/' + this.fileName + '.json',
      );
      const resProducts = data.listinginfo;
      try {
        const products = require(productsPath);
        const newKeys = Object.keys(data.listinginfo).filter(
          (key) => !products[key],
        );
        if (!newKeys.length) return null;
        const newProducts = {};
        for (const key of newKeys) {
          const newProd = data.listinginfo[key];
          if (!newProd.converted_fee) continue;
          newProducts[key] = newProd;
        }
        const updProducts = Object.assign(products, newProducts);
        const cashProducts = this.prepareCashProducts(updProducts);
        await fsp.writeFile(productsPath, JSON.stringify(cashProducts));
        return await this.stepThree(Object.values(newProducts));
      } catch {
        const cashProducts = this.prepareCashProducts(resProducts);
        await fsp.writeFile(productsPath, JSON.stringify(cashProducts));
        return await this.stepThree(Object.values(resProducts));
      }
    } catch (error) {
      this.proxiesTwo.resetProxy(proxy.id);
      console.log('Error Step 2: ' + proxy.id + error);
      return await this.stepTwo();
    }
  }

  prepareCashProducts(products) {
    const cashProducts = {};
    const logsProducts = {};
    for (const product of Object.values(products)) {
      cashProducts[product.listingid] = {
        listingid: product.listingid,
        converted_fee: product.converted_fee,
        converted_price: product.converted_price,
        total: (product.converted_price + product.converted_fee) / 100,
      };
      logsProducts[product.listingid] = {
        listingid: product.listingid,
        total: (product.converted_price + product.converted_fee) / 100,
      };
    }
    this.console.log({ cashProducts: logsProducts });
    return cashProducts;
  }

  async stepThree(products) {
    try {
      for (const product of products) {
        const { converted_fee: cvFee, converted_price: cvPrice } = product;
        if (!cvFee || !cvPrice) continue;
        const productPrice = (cvFee + cvPrice) / 100;
        if (productPrice <= this.floatPrices['def'].max) {
          await this.buyProduct(product, 'def');
        } else {
          const float = await this.requestFloat(product);
          if (!float) continue;
          this.console.log({
            id: product.listingid,
            float,
            total: productPrice,
          });
          for (const [floatDef, { min, max }] of Object.entries(
            this.floatPrices,
          )) {
            if (floatDef === 'def') continue;
            if (productPrice > max || productPrice < min) continue;
            const [floatMin, floatMax] = floatDef.split('-');
            if (float >= Number(floatMin) && float <= Number(floatMax)) {
              await this.buyProduct(product, float);
              continue;
            }
          }
        }
      }
    } catch (error) {
      console.log('Error step 3: ' + error);
    }
  }

  async requestFloat(product) {
    try {
      this.console.log('Linux request for: ' + product.listingid);
      const url =
        this.floatUrl +
        product.asset.market_actions[0].link
          .replace('%listingid%', product.listingid)
          .replace('%assetid%', product.asset.id);

      const { body } = await request(url, { method: 'GET' });
      const data = await body.json();
      return data.iteminfo.floatvalue;
    } catch (error) {
      console.log('Error: step 3 ' + error);
      return await this.requestFloat(product);
    }
  }

  async buyProduct(product, float) {
    try {
      const { converted_price: cvPrice, converted_fee: cvFee } = product;
      if (!cvPrice || !cvFee) return;
      this.console.log('BUYING PRODUCT');
      const productPrice = (cvFee + cvPrice) / 100;
      this.console.log({
        total: productPrice,
        listingid: product.listingid,
        float,
      });
      const { listingid } = product;
      const account = this.getAccount(cvPrice + cvFee);
      if (!account) {
        this.console.log('BALANCE IS TOO LOW');
        const message =
          `BALANCE IS TOO LOW FOR BUYING: ${this.name}\n` +
          `PRICE: ${productPrice}\n` +
          `FLOAT: ${float}`;
        await this.sendTgMessage(message);
        return;
      }
      const { cookie, name } = account;
      this.console.log(name);
      const sessionid = account.cookie
        .split(';')
        .find((x) => x.includes('sessionid'))
        .split('=')[1];
      const urlencoded = new URLSearchParams();
      urlencoded.append('sessionid', String(sessionid.trim()));
      urlencoded.append('currency', String(this.currencyIdx));
      urlencoded.append('subtotal', String(cvPrice));
      urlencoded.append('fee', String(cvFee));
      urlencoded.append('total', String(cvPrice + cvFee));
      urlencoded.append('quantity', '1');
      urlencoded.append('billing_state', ' ');
      urlencoded.append('save_my_address', '0');
      this.console.log({
        urlencoded,
      });

      const headers = {
        Accept: '*/*',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8,uk;q=0.7,de;q=0.6',
        Connection: 'keep-alive',
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookie,
        Host: 'steamcommunity.com',
        Origin: 'https://steamcommunity.com',
        Referer:
          'https://steamcommunity.com/market/listings/730/' +
          this.nameDec.trim(),
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
        'sec-ch-ua':
          '"Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
      };
      const res = await request(this.buyUrl + listingid, {
        method: 'POST',
        headers,
        body: urlencoded.toString(),
      });
      this.console.log({ buyStatus: res.statusCode });
      if (res.statusCode !== 200) {
        const message =
          `STATUS CODE: ${res.statusCode}` +
          `WASNT BOUGHT: ${this.name}\n` +
          `PRICE: ${productPrice}\n` +
          `FLOAT: ${float}`;
        await this.sendTgMessage(message);
        return;
      }
      await account.checkBalance();
      const message =
        `BOUGHT: ${this.name}\n` +
        `PRICE: ${productPrice}\n` +
        `FLOAT: ${float}`;
      await this.sendTgMessage(message);
    } catch (error) {
      console.log('Error while bying: ' + error);
      return;
    }
  }
}

module.exports = SteamItem;
