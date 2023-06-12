const axios = require('axios');
const { addEntry } = require('./dbHelpers/messagelog');
const {
  fetchRateConfig,
  fetchEffectiveRateConfig, 
  saveRateConfig,
  removeRateConfig,
} = require('./dbHelpers/rateConfig')
const { fetchSystemSetting, saveSystemSetting } = require('./dbHelpers/systemSetting');

// constants
const DEFAULT_SYSTEM_SETTING = {
  systemKey: 'system',
  executionMode: 'test'
}

const smsService = {
  getSystemSetting: async () => {
    try {
      const result = fetchSystemSetting()
      return result;
    } catch(err) {
      throw err;
    }
  },

  getRateConfig: async (payload) => {
    try {
      console.log('coreService.getrateConfig => payload: ', payload);
      const result = fetchRateConfig(payload)
      return result;
    } catch(err) {
      throw err;
    }
  },

  updateSystemSetting: async (payload) => {
    try {
      const updated = await saveSystemSetting(payload)
      return updated;
    } catch(err) {
      throw err;
    }
  },

  updateRateConfig: async (payload) => {
    try {
      const updated = await saveRateConfig(payload)
      return updated
    } catch(err) {
      throw err;
    }
  },

  deleteRateConfig: async (payload) => {
    try {
      await removeRateConfig(payload)
      return true;
    } catch(err) {
      throw err;
    }
  },

  send: async (params) => {
    try {
      const systemSetting = await fetchSystemSetting() || DEFAULT_SYSTEM_SETTING;
      const rateConfig = await fetchEffectiveRateConfig({
        key: params.key,
        to: params.to
      });

      const keyPhoneNo = `${params.key}_${params.to}`
      const available = await addEntry(keyPhoneNo, rateConfig);
      if (available) {
        if (systemSetting.executionMode === 'production') {
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
