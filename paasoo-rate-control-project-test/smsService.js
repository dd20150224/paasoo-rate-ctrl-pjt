const axios = require('axios');
const { stringify } = require('querystring');
const { addEntry, getRateConfig } = require('./helpers');

/*
  paasoo: {
    key: env['NOTIFICATION_PAASOO_KEY'],
    secret: env['NOTIFICATION_PAASOO_SECRET'],
    from: env['NOTIFICATION_PAASOO_FROM'],

    endpoints: {
      single: 'https://api.paasoo.com/json',
      batch: 'https://api.paasoo.com/batch_json'
    },
    defaultName: 'YOOV'
  }
*/
// const PAASOO_API_URL = 'https://api.paasoo.com/json';
// const OFFSET_MINUTES = process.env.OFFSET_MINUTES || 1;
// const MESSAGE_LIMIT = process.env.MESSAGE_LIMIT || 20;

// const DUMMY_CONFIG = {
//   key: process.env.PAASOO_KEY,
//   secret: process.env.PAASOO_SECRET,
//   from: process.env.PAASOO_FROM
// }


const smsService = {
  send: async (params) => {
    console.log('service.send: params: ', params);
    const keyPhoneNo = `${params.key}_${params.to}`;
    try {
      const rateConfig = await getRateConfig(keyPhoneNo);
      console.log('rateConfig: ', rateConfig);
      // perValue
      // perUnit
      //

      console.log('PAASOO_API_URL = ' + process.env.PAASOO_API_URL);

      const available = await addEntry(keyPhoneNo, rateConfig);
      console.log('available = ' + (available ? 'yes' : 'no')); 
      if (available) {
        // await axios.get(PAASOO_API_URL, {
        //   headers: {
        //     'Accept': 'application/json',
        //     'Content-Type': 'application/json'
        //   },
        //   params
        // });
        return true;
      } else {
        throw new Error('quota-exceeded');
      }
    } catch(err) {
      console.log('err: ', err);
      throw err;
    }  
  }
}

module.exports = smsService
