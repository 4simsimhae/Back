const express = require('express');
const app = express();

const chat = require('./chat');
const debate = require('./debate');
const room = require('./room');
const roulette = require('./roulette');

module.exports = [chat, debate, room, roulette];
