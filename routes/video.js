const express = require('express');
const router = express.Router();
const { User, Kategorie, UserInfo, Room, subject, chat } = require('../models');


router

router.get('/:video', (req, res) => {
    res.render('room', {roomId: req.params.room})
})


module.exports = router;