'use strict';

class AccountsManages {
  accounts = [
    {
      name: 'alex_pankov',
      password: 'indigo',
      proxyUrl: 'Cg8uH3wv:bmMRxJVz@166.1.236.65:64946',
      balance: 0,
    },
    {
      name: '828softloan2u',
      password: 'YS53GCDTFFFY',
      proxyUrl: 'Cg8uH3wv:bmMRxJVz@154.196.32.253:64096',
      balance: 0,
    },
    {
      name: 'felipess12',
      password: 'WkJSlEateP9aSL',
      proxyUrl: 'Cg8uH3wv:bmMRxJVz@154.195.7.207:62558',
      balance: 0,
    },
    {
      name: 'bebaane',
      password: 'pirin',
      proxyUrl: 'Cg8uH3wv:bmMRxJVz@154.195.127.181:64640',
      balance: 0,
    },
  ];
  activeAccount = null;
  constructor() { }

  async checkAccounts() {
    for (const account of this.accounts) {
      if (account.balance > 0) {
        this.activeAccount = account;
        return;
      }
    }
  }
  getAccount() {
    return this.activeAccount;
  }
}

module.exports = AccountsManages;
