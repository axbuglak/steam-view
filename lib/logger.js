'use strict';

const fs = require('node:fs');
const util = require('node:util');
const path = require('node:path');

const COLORS = {
  info: '\x1b[1;37m',
  log: '\x1b[1;37m',
  debug: '\x1b[1;33m',
  error: '\x1b[0;31m',
  system: '\x1b[1;34m',
  access: '\x1b[1;38m',
};

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

  write(type = 'info', s) {
    const now = new Date().toISOString();
    const date = now.substring(0, DATETIME_LENGTH);
    const color = COLORS[type];
    const line = date + '\t' + s;
    console.log(color + line + '\x1b[0m');
    const out = line.replace(/[\n\r]\s*/g, '; ') + '\n';
    this.stream.write(out);
  }

  log(...args) {
    const msg = util.format(...args);
    this.write('info', msg);
  }

  dir(...args) {
    const msg = util.inspect(...args);
    this.write('info', msg);
  }

  debug(...args) {
    const msg = util.format(...args);
    this.write('debug', msg);
  }

  error(...args) {
    const msg = util.format(...args).replace(/[\n\r]{2,}/g, '\n');
    this.write('error', msg.replaceAll(path.dirname(this.path), ''));
  }

  system(...args) {
    const msg = util.format(...args);
    this.write('system', msg);
  }

  access(...args) {
    const msg = util.format(...args);
    this.write('access', msg);
  }
}

module.exports = (productName) =>
  Object.freeze(new Logger('./log', productName));
