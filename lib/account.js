'use strict';

const { ProxyAgent, request } = require('undici');
const { JSDOM } = require('jsdom');

class AccountsManages {
  accounts = [
    {
      name: '828softloan2u',
      password: 'YS53GCDTFFFY',
      proxyUrl: 'Cg8uH3wv:bmMRxJVz@154.196.32.253:64096',
      balance: 0,
      cookie: '',
    },
    {
      name: 'alex_pankov',
      password: 'indigo',
      proxyUrl: 'Cg8uH3wv:bmMRxJVz@166.1.236.65:64946',
      balance: 0,
      cookie: '',
    },
    {
      name: 'felipess12',
      password: 'WkJSlEateP9aSL',
      proxyUrl: 'Cg8uH3wv:bmMRxJVz@154.195.7.207:62558',
      balance: 0,
      cookie: '',
    },
    {
      name: 'bebaane',
      password: 'pirin',
      proxyUrl: 'Cg8uH3wv:bmMRxJVz@154.195.127.181:64640',
      balance: 0,
      cookie: '',
    },
  ];
  activeAccounts = [];
  activeAccountsIdx = [];
  constructor(accountsCookies, delay = 1) {
    this.delay = delay;
    for (const accountCookie of accountsCookies) {
      const acc = this.accounts.find((a) => a.name === accountCookie['Login']);
      if (!acc.cookie) acc.cookie = accountCookie['Cookie'];
      acc.proxy = new ProxyAgent(`http://${acc.proxyUrl}`);
    }
    this.activeAccountsIdx = [0, 1];
    this.setActiveAccounts();
    this.checkAccounts();
  }

  setActiveAccounts() {
    this.activeAccounts = [];
    for (let i = 0; i < this.activeAccountsIdx.length; i++) {
      const idx = this.activeAccountsIdx[i];
      let account = this.accounts[idx];
      if (!account) {
        const newIdx = idx - (this.accounts.length - 1);
        this.activeAccountsIdx[i] = newIdx;
        account = this.accounts[newIdx];
      }
      this.activeAccounts.push(account);
    }
  }

  async checkAccounts() {
    for (const account of this.accounts) {
      setInterval(async () => {
        const headers = {
          Cookie: account.cookie,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' +
            'AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          Connection: 'keep-alive',
          Referer: 'https://steamcommunity.com/',
        };
        const res = await request('https://steamcommunity.com/#scrollTop=0', {
          method: 'GET',
          headers,
          dispatcher: account.proxy,
        });
        const html = await res.body.text();
        const dom = new JSDOM(html);
        const balance = dom.window.document.getElementById(
          'header_wallet_balance',
        );
        if (balance) account.balance = balance.textContent.slice(0, -5);
      }, this.delay * 1000);
    }
  }
  getAccount(price) {
    const closest = this.activeAccounts.reduce(
      (acc, curr) => {
        if (price > curr.balance) return acc;
        const newDiff = Math.abs(curr.balance - price);
        if (acc.diff === null || newDiff < acc.diff) {
          acc.diff = newDiff;
          acc.item = curr;
        }
        return acc;
      },
      { diff: null, item: null },
    );
    if (closest.diff !== null) return closest.item;
    this.activeAccountsIdx = this.activeAccountsIdx.map((i) => i + 1);
    this.setActiveAccounts();
    return this.getAccount(price);
  }
}

module.exports = AccountsManages;
