const smsService = require('./functions/smsService');
const { saveSystemSetting } = require('./functions/helpers');

const SmsController = {
  upsertRateConfig: async (req, res) => {

  },

  upsertSystemSetting: async (req, res) => {
    try {
      await saveSystemSetting({
        mode: req.body.mode
      })
      return res.json({
        result: true,
        message: 'success'
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
      await smsService.send(payload);
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

module.exports = SmsController;
