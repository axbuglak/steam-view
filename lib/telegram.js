'use strict';

const { Telegraf } = require('telegraf');

class TelegramBot {
  constructor(token, userId) {
    this.token = token;
    this.userId = userId;
    this.bot = new Telegraf(token);
  }

  async sendMessage(message) {
    try {
      console.log('Sending message to Telegram');
      await this.bot.telegram.sendMessage(this.userId, message);
    } catch (err) {
      console.log('Error while sending message to Telegram', err);
    }
  }
}

module.exports = TelegramBot;
