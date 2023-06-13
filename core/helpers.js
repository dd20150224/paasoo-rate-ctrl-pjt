const crypto = require('crypto');
const bcrypt = require('bcrypt');

const SEED = 3;

const getRandomKeySecret = async () => {
  const token = crypto.randomUUID();
  const result = await bcrypt.hash(token, SEED);
  console.log('token = ' + token);
  console.log('result = ' + result);
  return {
    key: token,
    secret: result
  };
}

const isValidKeySecret = async (key, secret) => {
  return await bcrypt.compare(key, secret);
}

const checkAuth = async (req, res, next) => {
  const key = req.headers['x-auth-key'];
  const secret = req.headers['x-auth-secret'];

  // console.log('req.headers: ', req.headers);
  // console.log('checkAdminAuth key = ' + key);
  // console.log('checkAdminAuth secret = ' + secret);

  if (key && secret) {
    if (isValidKeySecret(key, secret)) {
      return next();
    }
  }
  return res.status(401).json({
    message: 'access-denied'
  })
}

module.exports = {
  getRandomKeySecret,
  isValidKeySecret,
  checkAuth
};
