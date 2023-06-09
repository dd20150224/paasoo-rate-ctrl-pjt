const { DynamoDBClient, BatchWriteItemCommand } = require("@aws-sdk/client-dynamodb");
const { BatchGetCommand, DynamoDBDocumentClient, PutCommand, UpdateCommand, QueryCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

const MODES = ['test', 'production'];

const DEFAULT_CONFIG = {
  perValue: 1,
  perUnit: 'minute',
  quota: 5
}

const DEFAULT_SYSTEM_SETTING = {
  systemKey: 'system',
  systemMode: 'test'
}

const messageLogTable = process.env.DYNAMODB_MESSAGE_LOG_TABLE;
const configTable = process.env.DYNAMODB_CONFIG_TABLE;
const systemSettingTable = process.env.DYNAMODB_SYSTEM_SETTING_TABLE;

const updateSystemSetting = async (docClient, payload) => {
  console.log('updateSystemSetting: payload: ', payload);
  const command = new UpdateCommand({
    TableName: systemSettingTable,
    Key: {"systemKey": "system"},
    UpdateExpression: "set systemMode = :mode",
    ExpressionAttributeValues: {
      ":mode": payload.mode
    },
    ReturnValues: "ALL_NEW",
  });
  try {
    const result = await docClient.send(command);
    return result;
  } catch (err) {
    console.log('updateSystemSetting err: ', err);
    throw err;
  }
}

const insertSystemSetting = async (docClient, payload) => {
  try {
    const putCommand = new PutCommand({
      TableName: systemSettingTable,
      Item: {
        systemKey: 'system',
        systemMode: payload.mode
      }
    })
    const res = await docClient.send(putCommand);
  } catch(err) {
    throw new Error('Fails insert system setting!');
  }
}

const saveSystemSetting = async (payload) => {
  if (!MODES.includes(payload.mode)) {
    const modesWithQuotes = MODES.map(mode => `"${mode}"`);
    throw new Error(`Invalid Values! Only ${modesWithQuotes.join(', ')} are acceptable.`);
  }
  const dbClient = new DynamoDBClient({region: 'ap-southeast-1'});
  const docClient = DynamoDBDocumentClient.from(dbClient);
  const command = new QueryCommand({
    TableName: systemSettingTable,
    KeyConditionExpression: "systemKey = :systemKey", // >= :offsetStartTimeStr",
    ExpressionAttributeValues: {
      ":systemKey": 'system',
    }
  })
  const response = await docClient.send(command);
  console.log('getSystemConfig: response: ', response);
  try {
    if (response.Items[0]) {
      await updateSystemSetting(docClient, payload);
    } else {
      await insertSystemSetting(docClient, payload);
    }
    return true;
  } catch(err) {
    throw err;
  }
}

const getSystemSetting = async () => {
  const dbClient = new DynamoDBClient({region: 'ap-southeast-1'});
  const docClient = DynamoDBDocumentClient.from(dbClient);
  const command = new QueryCommand({
    TableName: systemSettingTable,
    KeyConditionExpression: "systemKey = :systemKey", // >= :offsetStartTimeStr",
    ExpressionAttributeValues: {
      ":systemKey": 'system',
    }
  })
  try {
    const response = await docClient.send(command);
    console.log('getSystemConfig: response: ', response);
    return response.Items[0] || DEFAULT_SYSTEM_SETTING;
  } catch(err) {
    console.log('getRateConfig err: ', err);
    throw err;
  }
}

const getRateConfig = async (keyPhoneNo) => {
  const dbClient = new DynamoDBClient({region: 'ap-southeast-1'});
  const docClient = DynamoDBDocumentClient.from(dbClient);
  const command = new QueryCommand({
    TableName: configTable,
    KeyConditionExpression: "keyPhoneNo = :keyPhoneNo", // >= :offsetStartTimeStr",
    ExpressionAttributeValues: {
      ":keyPhoneNo": keyPhoneNo,
    }
  })
  try {
    const response = await docClient.send(command);
    return response.Items[0] || DEFAULT_CONFIG;
  } catch(err) {
    console.log('getRateConfig keyPhoneNo = ' + keyPhoneNo);
    console.log('getRateConfig err: ', err);
    throw err;
  }
}

const getObsolateItems = async (docClient, keyPhoneNo, offsetStartTimeStr) => {
  const command = new QueryCommand({
    TableName: messageLogTable,
    KeyConditionExpression: "keyPhoneNo = :keyPhoneNo AND sentAt < :offsetStartTimeStr", // >= :offsetStartTimeStr",
    ExpressionAttributeValues: {
      ":keyPhoneNo": keyPhoneNo,
      ":offsetStartTimeStr": offsetStartTimeStr,
    }
  })
  try {
    const response = await docClient.send(command);
    return response.Items;
  } catch( err) {
    console.log('getObsolateItemserr: keyPhoneNo = ' + keyPhoneNo);
    console.log('getObsolateItemserr: offsetStartTimeStr = ' + offsetStartTimeStr);
    throw err;
  }
}

const deleteItems = async (
  dbClient,
  docClient,
  keyPhoneNo, 
  currentTime, 
  offsetStartTime) => {
  const offsetStartTimeStr = offsetStartTime.format('YYYY-MM-DD HH:mm:ss.sss');
  const obsolateItems = await getObsolateItems(docClient, keyPhoneNo, offsetStartTimeStr);
  if (obsolateItems.length > 0) {
    const params = {
      RequestItems: {
        [messageLogTable]: []
      }
    }
    for (let i = 0; i < obsolateItems.length; i++) {
      const loopItem = obsolateItems[i];
      params.RequestItems[messageLogTable].push({
        DeleteRequest: {
          Key: {
            keyPhoneNo: { S: loopItem.keyPhoneNo },
            sentAt: { S: loopItem.sentAt }
          }
        }
      })
    }

    try {
      const res = await dbClient.send(new BatchWriteItemCommand(params));
    } catch (err) {
      console.log('deleteItems: tableName = ' + messageLogTable);
      console.log('deleteItems: keyPhoneNo = ' + keyPhoneNo);
      console.log('deleteItems: err: ', err);
    }
  }
}

const getCurrentCount = async (docClient, keyPhoneNo, currentTime, offsetStartTime) => {
  const offsetStartTimeStr = offsetStartTime.format('YYYY-MM-DD HH:mm:ss.sss');
  const currentTimeStr = currentTime.format('YYYY-MM-DD HH:mm:ss.sss');

  const command = new QueryCommand({
    TableName: messageLogTable,
    Select: 'COUNT' ,
    KeyConditionExpression: "keyPhoneNo = :keyPhoneNo AND sentAt BETWEEN :offsetStartTimeStr AND :currentTimeStr", // >= :offsetStartTimeStr",
    ExpressionAttributeValues: {
      ":keyPhoneNo": keyPhoneNo,
      ":offsetStartTimeStr": offsetStartTimeStr,
      ":currentTimeStr": currentTimeStr,
    }
  });

  try {
    const response = await docClient.send(command);
    return response.Count;
  } catch(err) {
    console.log('getCurrentCount: keyPhoneNo = ' + keyPhoneNo);
    console.log('getCurrentCount: currentTime = ' + currentTime.format('YYYY-MM-DD HH:mm:ss.sss'));
    console.log('getCurrentCount: offsetStartTime = ' + offsetStartTime.format('YYYY-MM-DD HH:mm:ss.sss'));
    console.log('getCurrentCount: err: ', err);
    throw err;
  }
}

const addItem = async (docClient, keyPhoneNo, currentTime ) => {
  const currentTimeStr = currentTime.format('YYYY-MM-DD HH:mm:ss.sss');
  try {
    const putCommand = new PutCommand({
      TableName: messageLogTable,
      Item: {
        keyPhoneNo,
        sentAt: currentTimeStr
      }
    })
    const res = await docClient.send(putCommand);  
    console.log('addItem res: ', res);
  } catch(err) {
    console.log('addItem keyPhoneNo = ' + keyPhoneNo);
    console.log('addItem currentTime = ' + currentTime.format('YYYY-MM-DD HH:mm:ss.sss'));
    throw err;
  }
}

const addEntry = async (keyPhoneNo, rateConfig) => {
  let result = false;
  try {
    const dbClient = new DynamoDBClient({region: 'ap-southeast-1'});
    const docClient = DynamoDBDocumentClient.from(dbClient);
    const currentTime = dayjs.utc();
    const offsetStartTime = currentTime.subtract(rateConfig.perValue, rateConfig.perUnit);

    console.log('addEntry: limitation: ' + rateConfig.perValue + ' per ' + rateConfig.perUnit);
    console.log('addEntry offsetStartTime = ' + offsetStartTime.format('YYYY-MM-DD HH:mm:ss.sss'));
    console.log('addEntry currentTime = ' + currentTime.format('YYYY-MM-DD HH:mm:ss.sss'));
    
    const count = await getCurrentCount(
      docClient, 
      keyPhoneNo,
      currentTime, 
      offsetStartTime);

    if (count < rateConfig.quota) {
      await addItem(
        docClient, 
        keyPhoneNo, 
        currentTime);
      await deleteItems(
        dbClient, 
        docClient,
        keyPhoneNo, 
        currentTime, 
        offsetStartTime);
      result = true;
    }
    console.log('addEntry result count = ' + count);
    console.log('addEntry result rateConfig.quota = ' + rateConfig.quota);
    return result;
  } catch(err) {
    console.log('addEntry: keyPhoneNo = ' + keyPhoneNo);
    console.log('addEntry: rateConfig: ', rateConfig);  
    console.log('addEntry: err: ', err);
    return false;
  }
  return false;
}

module.exports = {
  addEntry,
  getRateConfig,
  getSystemSetting,
  saveSystemSetting
}