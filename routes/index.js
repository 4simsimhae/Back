const express = require('express');
const app = express();

const room = require('./room');
const roulette = require('./roulette');
const video = require('./video.js');

module.exports = [room, roulette, video];