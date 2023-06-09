const smsService = require('./smsService');

module.exports.handler = async (event) => {
  const params = event.queryStringParameters;
  try {
    // await service.send(params);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'success',
        result: true
      })
    }
  } catch(err) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: err.toString(),
        result: false
      })
    }
  }
  // return {
  //   statusCode: 200,
  //   body: JSON.stringify(
  //     {
  //       message: "Go Serverless v3.0! Your function executed successfully!",
  //       input: event,
  //     },
  //     null,
  //     2
  //   ),
  // };
};
