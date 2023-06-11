const {
  DynamoDBClient,  
  BatchWriteItemCommand,
} = require('@aws-sdk/client-dynamodb')
const {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  DeleteCommand,
} = require('@aws-sdk/lib-dynamodb')

// initialization

const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
dayjs.extend(utc)
const configTable = process.env.DYNAMODB_CONFIG_TABLE

// functions

const updateRateConfig = async (docClient, payload) => {
  const command = new UpdateCommand({
    TableName: configTable,
    Key: { keyPhoneNo: payload.keyPhoneNo },
    ExpressionAttributeValues: {
      ':perUnit': payload.perUnit,
      ':perValue': payload.perValue,
      ':quota': payload.quota,
    },
    UpdateExpression:
      'SET perUnit = :perUnit, perValue = :perValue, quota =:quota',
    ReturnValues: 'ALL_NEW',
  })
  try {
    const result = await docClient.send(command)
    return result.Attributes;
  } catch (err) {
    throw err;
  }
}

const insertRateConfig = async (docClient, payload) => {
  console.log('insertRateConfig: payload: ', payload);
  console.log('insertRateConfig: payload.quota = ' + payload.quota);
  try {
    const putCommand = new PutCommand({
      TableName: configTable,
      Item: payload,
    })
    const res = await docClient.send(putCommand);
    return payload;
    console.log('insertRateConfig: res: ', res);
  } catch (err) {
    console.log('insertRateConfig: err: ', err);
    throw new Error('Fails insert rate config!');
  }
}

const removeRateConfig = async (payload) => {
  console.log(1);
  const keyPhoneNo =
    payload.key === '*' && payload.to === '*'
      ? '*'
      : `${payload.key}_${payload.to}`

  console.log(2)
  const dbClient = new DynamoDBClient({ region: 'ap-southeast-1' })
  console.log(3)
  const docClient = DynamoDBDocumentClient.from(dbClient)
  console.log(4)
  const command = new DeleteCommand({
    TableName: configTable,
    Key: { keyPhoneNo }
  })
  console.log(4)
  try {
    const response = await docClient.send(command)
    return true;
  } catch (err) {
    console.log('removeRateConfig: err: ', err);
    throw err
  }
}

const saveRateConfig = async (payload) => {
  const keyPhoneNo =
    payload.key === '*' && payload.to === '*'
      ? '*'
      : `${payload.key}_${payload.to}`

  // console.log('saveRateConfig: payload: ', payload);
  // console.log('saveRateConfig: keyPhoneNo = ' + keyPhoneNo);
  
  const dbClient = new DynamoDBClient({ region: 'ap-southeast-1' })
  const docClient = DynamoDBDocumentClient.from(dbClient, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  })
  const command = new QueryCommand({
    TableName: configTable,
    KeyConditionExpression: 'keyPhoneNo = :keyPhoneNo',
    ExpressionAttributeValues: {
      ':keyPhoneNo': keyPhoneNo,
    },
  })

  console.log(1)
  let response = null;
  console.log(2)
  try {
    console.log(3)
    response = await docClient.send(command)
    console.log(4)
  } catch(err) {
    console.log('saveRateConfig: err: ', err);
    throw err;
  }

  console.log(5);
  try {
    const data = {
      keyPhoneNo,
      perUnit: payload.perUnit,
      perValue: payload.perValue,
      quota: payload.quota,
    }
    console.log(6)
    const result = response.Items[0]
      ? await updateRateConfig(docClient, data)
      : await insertRateConfig(docClient, data);
    return result;
  } catch (err) {
    throw err
  }
}

const getConfigById = async (docClient, id) => {
  const command = new QueryCommand({
    TableName: configTable,
    KeyConditionExpression: 'keyPhoneNo = :keyPhoneNo', // >= :offsetStartTimeStr",
    ExpressionAttributeValues: {
      ':keyPhoneNo': id,
    },
  })
  try {
    const response = await docClient.send(command)
    return response.Items[0];
  } catch(err) {
    throw err;
  }
}

const fetchRateConfig = async (payload) => {
  const key = payload.key
  const to = payload.to
  const dbClient = new DynamoDBClient({ region: 'ap-southeast-1' })
  const docClient = DynamoDBDocumentClient.from(dbClient)

  let keyPhoneNo = `${key}_${to}`;
  keyPhoneNo = keyPhoneNo.replace('*_*', '*');


  let config = null

  try {
    config = await getConfigById(docClient, keyPhoneNo);
    return config;
  } catch (err) {
    console.log(`fetchRateConfig keyPhoneNo = key=${key}, phoneNo=${phoneNo}`)
    console.log('fetchRateConfig err: ', err)
    throw err
  }
}

const fetchEffectiveRateConfig = async (payload) => {
  const key = payload.key
  const to = payload.to
  const dbClient = new DynamoDBClient({ region: 'ap-southeast-1' })
  const docClient = DynamoDBDocumentClient.from(dbClient)

  let config = null

  try {
    config = await getConfigById(docClient, `${key}_${to}`)
    if (config) return config

    config = await getConfigById(docClient, `${key}_*`)
    if (config) return config

    config = await getConfigById(docClient, `*`)
    if (config) return config

    return DEFAULT_CONFIG
  } catch (err) {
    console.log(`fetchRateConfig keyPhoneNo = key=${key}, phoneNo=${phoneNo}`)
    console.log('fetchRateConfig err: ', err)
    throw err
  }
}

module.exports = {
  saveRateConfig,
  fetchRateConfig,
  fetchEffectiveRateConfig,
  removeRateConfig,
}
