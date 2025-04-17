'use strict';

const { readXlsx, Proxies } = require('./lib/common');
const itemsIds = require('./static/NameID.json');
const SteamItem = require('./lib/steamItem');
const TelegramBot = require('./lib/telegram');
const AccountsManages = require('./lib/account');
const path = require('path');
const console = require('./lib/logger.js');

const dotenv = require('dotenv');
dotenv.config();
const BOT_TOKEN = process.env.BOT_TOKEN;
const USER_ID = process.env.USER_ID;
const bot = new TelegramBot(BOT_TOKEN, USER_ID);

const itemsPath = path.join(process.cwd(), 'static/items.xlsx');
const proxyPathOne = path.join(process.cwd(), 'static/accounts_stage1.xlsx');
const proxyPathTwo = path.join(process.cwd(), 'static/accounts_stage2.xlsx');
const accountsBuyPath = path.join(process.cwd(), 'static/accounts_buyer.xlsx');
const proxiesOne = new Proxies(proxyPathOne);
const proxiesTwo = new Proxies(proxyPathTwo);
const items = readXlsx(itemsPath);
const accountsBuy = readXlsx(accountsBuyPath);
const accounts = new AccountsManages(accountsBuy);
for (const item of items) {
  const { Name: name, Float: float, Price: price, Sleep: sleep } = item;
  const id = itemsIds.find(
    (item) => item.market_hash_name === name,
  ).commodityID;
  const getAccount = () => accounts.getAccount();
  const steamItem = new SteamItem({
    name,
    float,
    price,
    sleep,
    id,
    proxiesOne,
    proxiesTwo,
    console,
    getAccount,
    sendTgMessage: async (m) => await bot.sendMessage(m),
  });
  steamItem.stepOne();
}
