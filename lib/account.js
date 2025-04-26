'use strict';

const { request } = require('undici');
const { JSDOM } = require('jsdom');

class AccountsManages {
  accounts = [];
  activeAccounts = [];
  countWorkAcc = 2;
  constructor({ accountsCookies, delay = 60, critBalance = 5 }) {
    this.delay = delay;
    this.critBalance = critBalance;
    this.setup(accountsCookies);
  }

  async setup(accountsCookies) {
    for (const accountCookie of accountsCookies) {
      const acc = {};
      acc.cookie = accountCookie['Cookie'];
      acc.name = accountCookie['Login'];
      acc.balance = await this.getBalance(acc);
      acc.checkBalance = async () => {
        acc.balance = await this.getBalance(acc);
        console.log(acc.name + ' ' + acc.balance);
        if (acc.balance < this.critBalance) {
          this.activeAccounts.filter((x) => x.name !== acc.name);
          this.accounts.push(acc);
          this.activeAccounts.push(this.accounts.shift());
          this.checkAccounts();
        }
      };
      if (this.activeAccounts.length < this.countWorkAcc) {
        this.activeAccounts.push(acc);
      } else {
        this.accounts.push(acc);
      }
    }
    this.checkAccounts();
  }

  async getBalance(account) {
    const headers = {
      Cookie: account.cookie,
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' +
        'AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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
    const balance = dom.window.document.getElementById('header_wallet_balance');
    if (balance) {
      return Number(balance.textContent.slice(0, -5).replace(',', '.'));
    }
    return 0;
  }

  async checkAccounts() {
    for (const account of this.activeAccounts) {
      account.balanceInterval = setInterval(async () => {
        await account.checkBalance();
      }, this.delay * 1000);
    }
    for (const account of this.accounts) {
      clearInterval(account.balanceInterval);
      account.balanceInterval = null;
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
    return null;
    // this.accounts.push(...this.activeAccounts);
    // this.activeAccounts = [];
    // this.activeAccounts.push(this.accounts.shift());
    // this.activeAccounts.push(this.accounts.shift());
    // return this.getAccount(price);
  }
}

module.exports = AccountsManages;
