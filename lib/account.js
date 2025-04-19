'use strict';

const { request } = require('undici');
const { JSDOM } = require('jsdom');

class AccountsManages {
  accounts = [];
  activeAccounts = [];
  countWorkAcc = 2;
  constructor(accountsCookies, delay = 60) {
    this.delay = delay;
    for (const accountCookie of accountsCookies) {
      const acc = {};
      acc.cookie = accountCookie['Cookie'];
      acc.name = accountCookie['Login'];
      acc.balance = 0;
      if (this.activeAccounts.length < this.countWorkAcc) {
        this.activeAccounts.push(acc);
      } else {
        this.accounts.push(acc);
      }
    }
    console.log(this.activeAccounts);
    this.checkAccounts();
  }

  async checkAccounts() {
    for (const account of this.activeAccounts) {
      setInterval(async () => {
        const headers = {
          Cookie: account.cookie,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' +
            'AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          // Connection: 'keep-alive',
          Referer: 'https://steamcommunity.com/',
        };
        const res = await request('https://steamcommunity.com/#scrollTop=0', {
          method: 'GET',
          headers,
        });
        const html = await res.body.text();
        const dom = new JSDOM(html);
        const balance = dom.window.document.getElementById(
          'header_wallet_balance',
        );
        if (balance) account.balance = balance.textContent.slice(0, -5);
        console.log(account.name + ' ' + account.balance);
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
    this.accounts.push(...this.activeAccounts);
    this.activeAccounts = [];
    for (let i = 0; i < this.countWorkAcc; i++) {
      this.activeAccounts.push(this.accounts.shift());
    }
    return this.getAccount(price);
  }
}

module.exports = AccountsManages;
