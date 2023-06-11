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
const systemSettingTable = process.env.DYNAMODB_SYSTEM_SETTING_TABLE
const MODES = ['test', 'production']


// functions

const updateSystemSetting = async (docClient, payload) => {
  console.log('updateSystemSetting: payload: ', payload)
  const command = new UpdateCommand({
    TableName: systemSettingTable,
    Key: { systemKey: 'system' },
    UpdateExpression: 'set executionMode = :executionMode',
    ExpressionAttributeValues: {
      ':executionMode': payload.executionMode,
    },
    ReturnValues: 'ALL_NEW',
  })
  try {
    const result = await docClient.send(command);
    return result.Attributes;
  } catch (err) {
    console.log('updateSystemSetting err: ', err)
    throw err
  }
}

const insertSystemSetting = async (docClient, payload) => {
  try {
    const putCommand = new PutCommand({
      TableName: systemSettingTable,
      Item: {
        systemKey: 'system',
        executionMode: payload.executionMode,
      },
    })
    const res = await docClient.send(putCommand)
  } catch (err) {
    throw new Error('Fails insert system setting!')
  }
}

const saveSystemSetting = async (payload) => {
  if (!MODES.includes(payload.executionMode)) {
    const modesWithQuotes = MODES.map((mode) => `"${mode}"`)
    throw new Error(
      `Invalid Values! Only ${modesWithQuotes.join(', ')} are acceptable.`
    )
  }
  const dbClient = new DynamoDBClient({ region: 'ap-southeast-1' })
  const docClient = DynamoDBDocumentClient.from(dbClient)
  const command = new QueryCommand({
    TableName: systemSettingTable,
    KeyConditionExpression: 'systemKey = :systemKey', // >= :offsetStartTimeStr",
    ExpressionAttributeValues: {
      ':systemKey': 'system',
    },
  })
  const response = await docClient.send(command)
  console.log('getSystemConfig: response: ', response)
  try {
    if (response.Items[0]) {
      await updateSystemSetting(docClient, payload)
    } else {
      await insertSystemSetting(docClient, payload)
    }
    return true
  } catch (err) {
    throw err
  }
}


const fetchSystemSetting = async () => {
  const dbClient = new DynamoDBClient({ region: 'ap-southeast-1' })
  const docClient = DynamoDBDocumentClient.from(dbClient)
  const command = new QueryCommand({
    TableName: systemSettingTable,
    KeyConditionExpression: 'systemKey = :systemKey', // >= :offsetStartTimeStr",
    ExpressionAttributeValues: {
      ':systemKey': 'system',
    },
  })
  try {
    const response = await docClient.send(command)
    console.log('getSystemConfig: response: ', response)
    return response.Items[0] || null
  } catch (err) {
    console.log('getRateConfig err: ', err)
    throw err
  }
}

module.exports = {
  saveSystemSetting,
  fetchSystemSetting,
}

