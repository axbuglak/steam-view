'use strict';

const { request } = require('undici');
const path = require('node:path');
const fsp = require('node:fs/promises');
const sleep = (s) => new Promise((resolve) => setTimeout(resolve, s * 1000));

class SteamItem {
  firstUrl =
    'https://steamcommunity.com/market/itemordershistogram?country=UA&language=english&currency=18&item_nameid=';

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
      // SHOULD BE process.exit('Float and price mismatch');
      if (!prices[i] || !floats[i]) process.exit('Float and price mismatch');
      const [min, max] = prices[i].split('-');
      this.floatPrices[floats[i]] = {
        min: Number(min),
        max: Number(max),
      };
    }
    this.sendTgMessage = sendTgMessage;
    this.currencyIdx = 5;
    this.console = console;
    this.name = name;
    this.delay = delay;
    this.id = id;
    this.getAccount = getAccount;
    this.proxiesOne = proxiesOne;
    this.proxiesTwo = proxiesTwo;
    this.secondUrl = `https://steamcommunity.com/market/listings/730/${name}/render/?query=&start=0&count=10&country=RU&language=english&currency=5`;
    // UA -- // this.secondUrl = `https://steamcommunity.com/market/listings/730/${name}/render/?query=&start=0&count=10&country=UA&language=english&currency=18`;
    this.floatUrl = 'http://109.107.157.72:80/?url=';
    this.buyUrl = 'https://steamcommunity.com/market/buylisting/';
    this.stepOne();
  }

  analyzeGraph(graph) {
    if (!graph) return null;
    const res = {};
    for (let i = 0; i < graph.length; i++) {
      const prevItem = graph[i - 1] || [0, 0, ''];
      const currItem = graph[i];
      if (currItem[1] >= this.critPoint) {
        const count = this.critPoint - prevItem[1];
        res[currItem[0]] = count;
        return res;
      }
      const count = currItem[1] - prevItem[1];
      res[currItem[0]] = count;
    }
    return res;
  }

  async compareGraph(graph) {
    if (!this.lastGraph) {
      this.lastGraph = graph;
      await this.stepTwo();
      return null;
    }
    const prevGraph = this.lastGraph;
    this.lastGraph = graph;
    const changes = {};
    for (const [sum, count] of Object.entries(prevGraph)) {
      if (graph[sum] && graph[sum] > count) changes[sum] = graph[sum] - count;
    }
    if (Object.keys(changes).length > 0) {
      this.console.log('Changes' + changes);
      await this.stepTwo();
    }
    return null;
  }

  async stepOne() {
    await sleep(this.delay);
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
      if (!data) return void this.stepOne();
      const graph = data.sell_order_graph;

      const analyzedGraph = this.analyzeGraph(graph);
      // this.console.log(analyzedGraph);
      await this.compareGraph(analyzedGraph);
    } catch (error) {
      this.proxiesOne.resetProxy(proxy.id);
      console.log('Error step 1: ' + proxy.id + error);
      return void this.stepOne();
    }
    return void this.stepOne();
  }

  async stepTwo() {
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
      if (statusCode !== 200) return void this.stepTwo();
      const data = await body.json();
      console.log({ data });
      // this.console.log('Listening info: ' + data.listinginfo);

      const productsPath = path.join(
        process.cwd(),
        'static/products/' + this.id + '.json',
      );
      try {
        const products = require(productsPath);
        console.log({ productsList: products });
        const newProducts = Object.values(data.listinginfo).filter(
          ({ listingid }) => {
            const product = Object.values(products).find(
              ({ listingid: id }) => id === listingid,
            );
            return !product;
          },
        );
        if (newProducts.length) {
          this.console.log(this.id, 'Item. NewProducts: ', newProducts);
          await fsp.writeFile(productsPath, JSON.stringify(data.listinginfo));
          await this.stepThree(newProducts);
        }
      } catch {
        const products = data.listinginfo;
        console.log('CREATING FILE');
        await fsp.writeFile(productsPath, JSON.stringify(products));
        await this.stepThree(Object.values(products));
      }
    } catch (error) {
      this.proxiesTwo.resetProxy(proxy.id);
      console.log('Error Step 2: ' + proxy.id + error);
      return void this.stepTwo();
    }
  }

  async stepThree(products) {
    for (const product of products) {
      if (product.price < this.floatPrices['def'].max) {
        return void await this.buyProduct(product);
      } else {
        const float = await this.requestFloat(product);
        if (!float) continue;
        for (const [floatDef, { min, max }] of Object.entries(
          this.floatPrices,
        )) {
          if (floatDef === 'def') continue;
          if (product.price > max || product.price < min) continue;
          const [floatMin, floatMax] = floatDef.split('-');
          this.console.log({
            float,
            floatMin,
            floatMax,
            price: product.price,
            min,
            max,
          });
          if (float >= Number(floatMin) && float <= Number(floatMax)) {
            await this.buyProduct(product);
            continue;
          }
        }
      }
    }
    return;
  }

  async requestFloat(product) {
    try {
      const url =
        this.floatUrl +
        product.asset.market_actions[0].link
          .replace('%listingid%', product.listingid)
          .replace('%assetid%', product.asset.id);
      this.console.log({ url });

      const { body } = await request(url, { method: 'GET' });
      const data = await body.json();
      this.console.log({ data });
      return data.iteminfo.floatvalue;
    } catch (error) {
      console.log('Error: step 3 ' + error);
      return null;
    }
  }

  async buyProduct(product) {
    try {
      this.console.log('BUYING PRODUCT');
      const { converted_price: cvPrice, converted_fee: cvFee } = product;
      console.log({ product });
      const { listingid } = product;
      const account = this.getAccount();
      if (!account) {
        this.console.log('BALANCE IS TOO LOW');
        return;
      }
      const { cookie } = account;
      const sessionid = account.cookie.match(/sessionid=([^;]+)/)?.[1];
      const urlencoded = new URLSearchParams();
      urlencoded.append('sessionid', String(sessionid));
      urlencoded.append('currency', String(this.currencyIdx));
      urlencoded.append('subtotal', String(cvPrice));
      urlencoded.append('fee', String(cvFee));
      urlencoded.append('total', String(cvPrice + cvFee));
      urlencoded.append('quantity', '1');
      urlencoded.append('billing_state', ' ');
      urlencoded.append('save_my_address', '0');
      this.console.log({
        urlencoded,
        ref:
          'https://steamcommunity.com/market/listings/730/' +
          this.name
            .replaceAll(/\s/g, '%20')
            .replaceAll(/\|/g, '%7C')
            .replaceAll(/\(/g, '%28')
            .replaceAll(/\)/g, '%29'),
      });

      //
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
          this.name
            .replaceAll(/\s/g, '%20')
            .replaceAll(/\|/g, '%7C')
            .replaceAll(/\(/g, '%28')
            .replaceAll(/\)/g, '%29'),
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
        // dispatcher: proxy,
        body: urlencoded.toString(),
      });
      this.console.log({ buyStatus: res.statusCode });
      if (res.statusCode !== 200) return;
      await this.sendTgMessage('Product bought: ' + product);
    } catch (error) {
      console.log('Error while bying: ' + error);
      return;
    }
  }
}

module.exports = SteamItem;
