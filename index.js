#! /usr/bin/env node

const { Nulla, i18n } = require('./src/modules');

const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let args = process.argv.slice(2);
const isTS = Nulla.isTS(args);
const isTW = Nulla.isTW(args);

const tryNameRun = (name) => Nulla.tryRun(rl, name, {isTS, isTW});
let argName = args.join(' ');

if (!argName) {
  rl.question(i18n.questionName, tryNameRun);
} else {
  tryNameRun(argName);
}
