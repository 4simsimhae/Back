const express = require('express');
const app = express();

const room = require('./room');
const roulette = require('./roulette');

module.exports = [room, roulette];