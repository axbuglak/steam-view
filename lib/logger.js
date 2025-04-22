'use strict';

const fs = require('node:fs');
const util = require('node:util');
const path = require('node:path');

const DATETIME_LENGTH = 23;

class Logger {
  constructor(logPath, itemName) {
    this.path = logPath;
    const filePath = path.join(logPath, `${itemName}.log`);
    this.stream = fs.createWriteStream(filePath, { flags: 'a' });
    this.regexp = new RegExp(path.dirname(this.path), 'g');
  }

  close() {
    return new Promise((resolve) => this.stream.end(resolve));
  }

  write(s) {
    const now = new Date().toISOString();
    const date = now.substring(0, DATETIME_LENGTH);
    const line = date + '\t' + s;
    const out = line.replace(/[\n\r]\s*/g, '; ') + '\n';
    this.stream.write(out);
  }

  log(...args) {
    const msg = util.format(...args);
    this.write(msg);
  }

  dir(...args) {
    const msg = util.inspect(...args);
    this.write(msg);
  }

  debug(...args) {
    const msg = util.format(...args);
    this.write(msg);
  }

  error(...args) {
    const msg = util.format(...args).replace(/[\n\r]{2,}/g, '\n');
    this.write(msg.replaceAll(path.dirname(this.path), ''));
  }

  system(...args) {
    const msg = util.format(...args);
    this.write(msg);
  }

  access(...args) {
    const msg = util.format(...args);
    this.write(msg);
  }
}

module.exports = (productName) =>
  Object.freeze(new Logger('./log', productName));
