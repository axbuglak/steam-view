'use strict';

const xlsx = require('xlsx');
const { ProxyAgent } = require('undici');

function readXlsx(path) {
  const workbook = xlsx.readFile(path);
  const page = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[page];
  return xlsx.utils.sheet_to_json(worksheet);
}

function loadProxy(path) {
  const proxies = readXlsx(path);
  const proxiesList = [];
  let count = 0;
  for (const proxy of proxies) {
    const agent = new ProxyAgent(`http://${proxy.Proxy}`);
    proxiesList.push({ agent, cookie: proxy.Cookie, use: 0, id: count++ });
  }
  return proxiesList;
}

class Proxies {
  constructor(path) {
    this.proxies = loadProxy(path);
  }

  getProxy(proxyId = null) {
    let proxy = null;
    if (proxyId !== null) {
      proxy = this.proxies.filter((p) => p.id !== proxyId)[0];
    } else {
      proxy = this.proxies[0];
    }
    this.proxies[0].use += 1;
    this.proxies.sort((a, b) => a.use - b.use);
    return proxy;
  }

  resetProxy(id) {
    this.proxies.find((p) => p.id === id).use -= 1;
  }
}

module.exports = { readXlsx, Proxies };
