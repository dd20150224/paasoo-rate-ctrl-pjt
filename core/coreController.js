const coreService = require('./coreService');
const { saveSystemSetting } = require('./dbHelpers/systemSetting');
const { saveRateConfig, removeRateConfig } = require('./dbHelpers/rateConfig');

const CoreController = {
  deleteRateConfig: async (req, res) => {
    try {
      await coreService.deleteRateConfig({
        key: req.params.key,
        to: req.params.to || '*',
      })
      return res.json({
        result: true,
        message: 'Successfully deleted.',
      })
    } catch(err) {
      throw err;
      // throw new Error(`Delete fails (key=${req.params.key}, to=${req.params.to})`);      
    }
  },

  updateRateConfig: async (req, res) => {
    // console.log('updateRateConfig req: ', req);
    // console.log('updateRateConfig req.body: ', req.body);
    try {
      if (req.body.perUnit && req.body.perValue && req.body.quota) {
        const result = await coreService.updateRateConfig({
          key: req.params.key,
          to: req.params.to || '*',
          perUnit: req.body.perUnit,
          perValue: req.body.perValue,
          quota: req.body.quota
        })
        console.log('coreController updateRateConfig result: ', result);
        return res.json({
          result,
          message: 'Successfully updated.'
        })
      } else {
        throw new Error('Please provide perUnit, perValue, and quota.');
      }
    } catch(err) {
      throw err;
    }
  },

  getRateConfig: async (req, res) => {
    console.log('coreController getRateConfig');
    try {
      const payload = {
        key: req.params.key,
        to: req.params.to || '*'
      };
      const result = await coreService.getRateConfig(payload);
      return res.json({
        result,
      })
    } catch (err) {
      throw err
    }
  },

  getSystemSetting: async (req, res) => {
    try {
      const result = await coreService.getSystemSetting();
      return res.json({
        result
      })
    } catch(err) {
      throw err
    }
  },

  updateSystemSetting: async (req, res) => {
    try {
      const result = await coreService.updateSystemSetting({
        executionMode: req.body.executionMode
      })
      return res.json({
        result,
        message: 'Successfully updated.'
      })
    } catch(err) {
      return res.json({
        result: false,
        message: err.message
      })
    }
  },

  json: async (req, res) => {
    const payload = req.query;
    console.log('test: payload: ', payload);
    console.log('test: req.params: ', req.params);
    // const payload = {
    //   to: '+85290279335',
    //   text: 'hello world'
    // }
    try {
      await coreService.send(payload);
      console.log('after send');
      return res.json({
        result: true,
        message: 'success'
      })
    } catch(err) {
      console.log('err: ', err);
      return res.status(400).json({
        message: err.toString()
      })
    }
  }
}

module.exports = CoreController
