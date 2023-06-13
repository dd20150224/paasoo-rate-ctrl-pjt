const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const { checkAuth } = require('./core/helpers');
const CoreController = require('./core/coreController')

// constants
const PORT = process.env.PORT || 3000;

// initialization
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH']
}));

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// routes
app.get('/json', CoreController.json);

app.get('/rate-config/:key/:to?', CoreController.getRateConfig);
app.post('/rate-config/:key/:to?', checkAuth, CoreController.updateRateConfig);
app.delete('/rate-config/:key/:to?', CoreController.deleteRateConfig);

app.get('/system/setting', CoreController.getSystemSetting);
app.post('/system/setting', checkAuth, CoreController.updateSystemSetting);

app.get('/generate', checkAuth, CoreController.genAuth);

app.listen(PORT, (error) =>{
    if(!error)
        console.log(`Server started. (port=${PORT})`);
    else 
        console.log("Error occurred, server can't start", error);
    }
);