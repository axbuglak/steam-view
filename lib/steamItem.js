'use strict';

const { request } = require('undici');
const path = require('node:path');
const fsp = require('node:fs/promises');

class SteamItem {
  firstUrl =
    'https://steamcommunity.com/market/itemordershistogram?country=RU&language=english&currency=18&item_nameid=';

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
    this.console = console;
    this.name = name;
    this.delay = delay;
    this.id = id;
    this.getAccount = getAccount;
    this.proxiesOne = proxiesOne;
    this.proxiesTwo = proxiesTwo;
    this.secondUrl = `https://steamcommunity.com/market/listings/730/${this.nameDec}/render/?query=&start=0&count=10&country=RU&language=english&currency=5`;
    // UA -- // this.secondUrl = `https://steamcommunity.com/market/listings/730/${name}/render/?query=&start=0&count=10&country=UA&language=english&currency=18`;
    this.floatUrl = 'http://109.107.157.72:80/?url=';
    this.buyUrl = 'https://steamcommunity.com/market/buylisting/';
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
    this.console.log({ graph, name: this.name });
    const changes = {};
    console.log({ name: this.name, graph, prevGraph });
    for (const [sum, count] of Object.entries(graph)) {
      if (!prevGraph[sum]) {
        changes[sum] = count;
        continue;
      }
      if (prevGraph[sum] < count) changes[sum] = count;
    }
    if (Object.keys(changes).length > 0) {
      this.console.log('Changes' + changes);
      await this.stepTwo();
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
        if (!this.lastGraph) await this.stepTwo();
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
    console.log('STEP 2: ' + this.name);
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

      const productsPath = path.join(
        process.cwd(),
        'static/products/' + this.id + '.json',
      );
      const resProducts = data.listinginfo;
      try {
        const products = require(productsPath);
        const newProducts = Object.values(data.listinginfo).filter(
          ({ listingid }) => {
            const product = Object.values(products).find(
              ({ listingid: id }) => id === listingid,
            );
            return !product;
          },
        );
        if (newProducts.length) {
          console.log({ newProducts });
          await fsp.writeFile(productsPath, JSON.stringify(data.listinginfo));
          await this.stepThree(newProducts);
        }
      } catch {
        console.log('CREATING FILE');
        await fsp.writeFile(productsPath, JSON.stringify(resProducts));
        await this.stepThree(Object.values(resProducts));
      }
    } catch (error) {
      this.proxiesTwo.resetProxy(proxy.id);
      console.log('Error Step 2: ' + proxy.id + error);
      return void this.stepTwo();
    }
  }

  async stepThree(products) {
    console.log('STEP 3');
    console.log({ products });
    for (const product of products) {
      console.log({
        step: '3',
        prices: this.floatPrices,
        name: this.name,
        price: product.price,
      });
      const { converted_fee: cvFee, converted_price: cvPrice } = product;
      if (!cvFee || !cvPrice) continue;
      const productPrice = (cvFee + cvPrice) / 100;
      if (productPrice <= this.floatPrices['def'].max) {
        return void await this.buyProduct(product);
      } else {
        const float = await this.requestFloat(product);
        if (!float) continue;
        for (const [floatDef, { min, max }] of Object.entries(
          this.floatPrices,
        )) {
          if (floatDef === 'def') continue;
          if (product.price >= max || product.price <= min) continue;
          const [floatMin, floatMax] = floatDef.split('-');
          this.console.log({
            float,
            floatMin,
            floatMax,
            price: product.price,
            min,
            max,
            product,
          });
          if (float >= Number(floatMin) && float <= Number(floatMax)) {
            await this.buyProduct(product);
            continue;
          }
        }
      }
    }
  }

  async requestFloat(product) {
    try {
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
      return null;
    }
  }

  async buyProduct(product) {
    try {
      this.console.log({ product });
      const { converted_price: cvPrice, converted_fee: cvFee } = product;
      if (!cvPrice || !cvFee) return;
      this.console.log('BUYING PRODUCT');
      console.log({ product });
      const { listingid } = product;
      const account = this.getAccount();
      if (!account) {
        this.console.log('BALANCE IS TOO LOW');
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
      if (res.statusCode !== 200) return;
      await this.sendTgMessage('Product bought: ' + this.name);
    } catch (error) {
      console.log('Error while bying: ' + error);
      return;
    }
  }
}

module.exports = SteamItem;
