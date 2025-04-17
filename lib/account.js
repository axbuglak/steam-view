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
      cookie:
        'sessionid=4007532c98755880b745fde9; recentlyVisitedAppHubs=570; timezoneOffset=7200,0; cookieSettings=%7B%22version%22%3A1%2C%22preference_state%22%3A1%2C%22content_customization%22%3Anull%2C%22valve_analytics%22%3Anull%2C%22third_party_analytics%22%3Anull%2C%22third_party_content%22%3Anull%2C%22utm_enabled%22%3Atrue%7D; browserid=98624020016108160; app_impressions=2923300@2_100100_100101_100104; strInventoryLastContext=730_2; steamCountry=DE%7C8593b9702d17246c8d9792cefc650cba; steamLoginSecure=76561199024280128%7C%7CeyAidHlwIjogIkpXVCIsICJhbGciOiAiRWREU0EiIH0.eyAiaXNzIjogInI6MDAwNF8yNjI4N0YzOF80NDMxQyIsICJzdWIiOiAiNzY1NjExOTkwMjQyODAxMjgiLCAiYXVkIjogWyAid2ViOmNvbW11bml0eSIgXSwgImV4cCI6IDE3NDQ5ODkwMjUsICJuYmYiOiAxNzM2MjYwODc3LCAiaWF0IjogMTc0NDkwMDg3NywgImp0aSI6ICIwMDAxXzI2Mjg3RjMwXzU5Q0E1IiwgIm9hdCI6IDE3NDQ5MDA4NzYsICJydF9leHAiOiAxNzYzMTI5MTEyLCAicGVyIjogMCwgImlwX3N1YmplY3QiOiAiNzcuMTQuNDguMjQ1IiwgImlwX2NvbmZpcm1lciI6ICI3Ny4xNC40OC4yNDUiIH0.RhZ2TGFMk6-1GJbNKdEZb2MQFe-Zg_0i5d2jfxeCcAX7NLGTNepcp1IsOY2GEZIaP-yuT9GY-x3JlKhcnckzBA; webTradeEligibility=%7B%22allowed%22%3A1%2C%22allowed_at_time%22%3A0%2C%22steamguard_required_days%22%3A15%2C%22new_device_cooldown_days%22%3A0%2C%22time_checked%22%3A1744900894%7D',
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
        const balance = dom.window.document.querySelector(
          '#header_wallet_balance',
        );
        if (balance) account.balance = balance.textContent;
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
