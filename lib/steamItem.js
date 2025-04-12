'use strict';

const { request } = require('undici');
const sleep = (s) => new Promise((resolve) => setTimeout(resolve, s * 1000));

class SteamItem {
  firstUrl =
    'https://steamcommunity.com/market/itemordershistogram?country=UA&language=english&currency=18&item_nameid=';

  activeProxy = null;

  constructor(props) {
    const { name, float, price, sleep: delay } = props;
    const { id, proxiesOne, proxiesTwo } = props;
    this.name = name;
    this.float = float;
    this.price = price;
    this.delay = delay;
    this.id = id;
    this.proxiesOne = proxiesOne;
    this.proxiesTwo = proxiesTwo;
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
      console.log(proxy.id, ': Proxy || Response Data:', data);
    } catch {
      this.proxiesOne.resetProxy(proxy.id);
      console.log('Error: ' + proxy.id);
      return void this.stepOne();
    }
    return void this.stepOne();
  }
}

module.exports = SteamItem;
