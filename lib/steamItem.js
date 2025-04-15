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
    const { name, float, price, sleep: delay } = props;
    const { id, proxiesOne, proxiesTwo, console } = props;
    this.console = console;
    this.name = name;
    this.float = float;
    this.price = price;
    this.delay = delay;
    this.id = id;
    this.proxiesOne = proxiesOne;
    this.proxiesTwo = proxiesTwo;
    this.secondUrl = `https://steamcommunity.com/market/listings/730/${name}/render/?query=&start=0&count=10&country=UA&language=english&currency=18`;
  }

  analyzeGraph(graph) {
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
      const graph = data.sell_order_graph;
      const analyzedGraph = this.analyzeGraph(graph);

      this.console.log(analyzedGraph);
      this.console.log(graph);

      await this.compareGraph(analyzedGraph);
    } catch (error) {
      this.proxiesOne.resetProxy(proxy.id);
      console.log('Error: ' + proxy.id + error);
      return void this.stepOne();
    }
    return void this.stepOne();
  }

  async stepTwo() {
    const proxy = this.proxiesTwo.getProxy(this.activeProxy);
    this.activeProxy = proxy.id;
    try {
      const { body } = await request(this.secondUrl, {
        method: 'GET',
        headers: {
          Cookie: proxy.cookie,
        },
        dispatcher: proxy.agent,
      });
      const data = await body.json();
      this.console.log('Listening info: ' + data.listinginfo);
      this.proxiesTwo.resetProxy(proxy.id);
      this.activeProxy = null;

      const productsPath = path.join(
        process.cwd(),
        'static/products/' + this.id + '.json',
      );
      try {
        const products = require(productsPath);
        const newProducts = Object.values(data.listinginfo).filter(
          ({ listingid }) => {
            const product = [...products].find(
              ({ listingid: id }) => id === listingid,
            );
            return !product;
          },
        );
        if (newProducts.length) {
          await fsp.writeFile(productsPath, JSON.stringify(data.listinginfo));
          await this.stepThree(newProducts);
        }
      } catch {
        const products = data.listinginfo;
        await fsp.writeFile(productsPath, JSON.stringify(products));
        await this.stepThree(products);
      }
    } catch (error) {
      this.proxiesTwo.resetProxy(proxy.id);
      console.log('Error Step 2: ' + proxy.id + error);
      return void this.stepTwo();
    }
  }

  async stepThree() {
    await sleep(this.delay);
  }
}

module.exports = SteamItem;
