const express = require('express');
const router = express.Router();
const MainController = require('./mainController');

router.get('/json', MainController.test);

module.exports = router;