'use strict';

const { request } = require('undici');
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
    if (!this.lastGraph) return (this.lastGraph = graph);
    const prevGraph = this.lastGraph;
    this.lastGraph = graph;
    const changes = {};
    for (const { sum, count } of Object.entries(prevGraph)) {
      if (graph[sum] && graph[sum] > count) changes[sum] = graph[sum] - count;
    }
    if (Object.keys(changes).length > 0) {
      this.console.info(changes);
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

      this.console.info(analyzedGraph);
      this.console.info(graph);

      await this.compareGraph(analyzedGraph);
    } catch {
      this.proxiesOne.resetProxy(proxy.id);
      console.log('Error: ' + proxy.id);
      return void this.stepOne();
    }
    return void this.stepOne();
  }

  async stepTwo() {
    await sleep(this.delay * 5);
  }
}

module.exports = SteamItem;
