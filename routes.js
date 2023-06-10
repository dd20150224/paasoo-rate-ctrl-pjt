const express = require('express');
const router = express.Router();
const MainController = require('./mainController');

router.get('/json', MainController.json);
router.post('/rate-config/:key/:to', MainController.upsertRateConfig);
router.post('/system/set', MainController.upsertSystemSetting);

module.exports = router;