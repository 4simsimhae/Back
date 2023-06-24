const express = require('express');
const app = express();

// const debate = require('./debate');
const room = require('./room');
const roulette = require('./roulette');

module.exports = [room, roulette];
