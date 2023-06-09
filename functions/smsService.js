const axios = require('axios');
const { stringify } = require('querystring');
const { addEntry, getRateConfig, getSystemSetting } = require('./helpers');

const smsService = {
  send: async (params) => {
    const keyPhoneNo = `${params.key}_${params.to}`;
    try {
      const systemSetting = await getSystemSetting();
      const rateConfig = await getRateConfig(keyPhoneNo);
      const available = await addEntry(keyPhoneNo, rateConfig);
      if (available) {
        if (systemSetting.systemMode === 'production') {
          console.log('Productioin');
          await axios.get(process.env.PAASOO_API_URL, {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            params
          });
        } else {
          console.log('Test Mode (SMS not actually sent)');
        }
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
