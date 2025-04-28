'use strict';

const { request } = require('undici');
const { JSDOM } = require('jsdom');

class AccountsManages {
  accounts = [];
  activeAccounts = [];
  countWorkAcc = 2;
  constructor({ delay = 60, critBalance = 5 }) {
    this.delay = delay;
    this.critBalance = critBalance;
  }
  accountsTried = 0;

  async setup(accountsCookies) {
    this.accountsCount = accountsCookies.length;
    for (const accountCookie of accountsCookies) {
      const acc = {};
      acc.cookie = accountCookie['Cookie'];
      acc.name = accountCookie['Login'];
      acc.balance = 0;
      acc.checkBalance = async () => {
        acc.balance = await this.getBalance(acc);
        console.log(acc.name + ': ' + acc.balance);
        if (acc.balance < this.critBalance || isNaN(acc.balance)) {
          this.accountsTried++;
          if (this.accountsTried >= this.accountsCount) {
            process.exit('All accounts with low balance');
          }
          clearInterval(acc.balanceInterval);
          this.activeAccounts = this.activeAccounts.filter(
            (x) => x.name !== acc.name,
          );
          this.accounts.push(acc);
          const newActiveAcc = this.accounts.shift();
          newActiveAcc.balance = await this.getBalance(newActiveAcc);
          newActiveAcc.setBalanceObs();
          this.activeAccounts.push(newActiveAcc);
        }
      };
      acc.setBalanceObs = () => {
        acc.balanceInterval = setInterval(async () => {
          await acc.checkBalance();
        }, this.delay * 1000);
      };
      if (this.activeAccounts.length < this.countWorkAcc) {
        acc.balance = await this.getBalance(acc);
        console.log(acc.name + ': ' + acc.balance);
        if (acc.balance < this.critBalance || isNaN(acc.balance)) {
          continue;
        }
        acc.setBalanceObs();
        this.activeAccounts.push(acc);
      } else {
        this.accounts.push(acc);
      }
    }
    if (!this.activeAccounts.length) {
      process.exit('All accounts with low balance');
    }
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
    if (res.statusCode !== 200) {
      console.log(account.name + ' Balance req status: ' + res.statusCode);
      return 0;
    }
    const html = await res.body.text();
    const dom = new JSDOM(html);
    const balance = dom.window.document.getElementById('header_wallet_balance');
    if (balance) {
      return Number(balance.textContent.split(' ')[0].replace(',', '.'));
    }
    return 0;
  }

  async checkAccounts() {
    console.log({ gg: this.activeAccounts });
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
        if (price > curr.balance || curr.balance === 0) return acc;
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
