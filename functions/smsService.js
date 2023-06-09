const axios = require('axios');
const { stringify } = require('querystring');
const { addEntry, getRateConfig } = require('./helpers');

const smsService = {
  send: async (params) => {
    // console.log('service.send: params: ', params);
    const keyPhoneNo = `${params.key}_${params.to}`;
    try {
      const rateConfig = await getRateConfig(keyPhoneNo);
      // console.log('rateConfig: ', rateConfig);
      // console.log('PAASOO_API_URL = ' + process.env.PAASOO_API_URL);

      const available = await addEntry(keyPhoneNo, rateConfig);
      // console.log('available = ' + (available ? 'yes' : 'no')); 
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
      console.log('send: params: ', params);
      console.log('err: ', err);
      throw err;
    }  
  }
}

module.exports = smsService
