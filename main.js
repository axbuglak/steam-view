'use strict';

const { readXlsx, Proxies } = require('./lib/common');
const itemsIds = require('./static/NameID.json');
const SteamItem = require('./lib/steamItem');
const path = require('path');

const itemsPath = path.join(process.cwd(), 'static/items.xlsx');
const proxyPathOne = path.join(process.cwd(), 'static/accounts_stage1.xlsx');
const proxyPathTwo = path.join(process.cwd(), 'static/accounts_stage2.xlsx');
const proxiesOne = new Proxies(proxyPathOne);
const proxiesTwo = new Proxies(proxyPathTwo);
const items = readXlsx(itemsPath);
for (const item of items) {
  const { Name: name, Float: float, Price: price, Sleep: sleep } = item;
  const id = itemsIds.find(
    (item) => item.market_hash_name === name,
  ).commodityID;
  const steamItem = new SteamItem({
    name,
    float,
    price,
    sleep,
    id,
    proxiesOne,
    proxiesTwo,
  });
  steamItem.stepOne();
}
