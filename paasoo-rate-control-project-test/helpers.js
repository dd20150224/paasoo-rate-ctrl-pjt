const { DynamoDBClient, BatchWriteItemCommand } = require("@aws-sdk/client-dynamodb");
const { BatchGetCommand, DynamoDBDocumentClient, PutCommand, QueryCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

const dayjs = require('dayjs');

const DEFAULT_CONFIG = {
  perValue: 1,
  perUnit: 'minute',
  quota: 5
}

const messageLogTable = process.env.DYNAMODB_MESSAGE_LOG_TABLE;
const configTable = process.env.DYNAMODB_CONFIG_TABLE;

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
    console.log('getRateConfig response.Items.length = ' + response.Items.length);
    return response.Items[0] || DEFAULT_CONFIG;
  } catch(err) {
    console.log('err: ', err);
    throw err;
  }
}

const getObsolateItems = async (docClient, keyPhoneNo, offsetStartTimeStr) => {
  console.log('getObsolateItems: offsetStartTimeStr = ' + offsetStartTimeStr);
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
    console.log('getObsolateItems  response.Items.length = ' + response.Items.length);
    return response.Items;
  } catch( err) {
    console.log('err: ', err);
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

  console.log('deleteItems: tableName = ' + messageLogTable);
  console.log('deleteItems: keyPhoneNo = ' + keyPhoneNo);

  const obsolateItems = await getObsolateItems(docClient, keyPhoneNo, offsetStartTimeStr);


  if (obsolateItems.length > 0) {
    const params = {
      RequestItems: {
        messageLogTable: []
      }
    }
    console.log('obsolateItems.length = ' + obsolateItems.length);
    for (let i = 0; i < obsolateItems.length; i++) {
      const loopItem = obsolateItems[i];
      console.log('i=' + i + ': keyPhoneNo = ' + loopItem.keyPhoneNo);
      console.log('i=' + i + ': sentAt = ' + loopItem.sentAt);
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
      console.log(err);
    }
  }
}

const getCurrentCount = async (docClient, keyPhoneNo, currentTime, offsetStartTime) => {
  const offsetStartTimeStr = offsetStartTime.format('YYYY-MM-DD HH:mm:ss.sss');

  console.log('getCurrentCount: offsetStartTimeStr = ' + offsetStartTimeStr);
  const command = new QueryCommand({
    TableName: messageLogTable,
    Select: 'COUNT' ,
    KeyConditionExpression: "keyPhoneNo = :keyPhoneNo AND sentAt >= :offsetStartTimeStr", // >= :offsetStartTimeStr",
    ExpressionAttributeValues: {
      ":keyPhoneNo": keyPhoneNo,
      ":offsetStartTimeStr": offsetStartTimeStr,
    }
  });
  console.log('getCurrentCount 2');

  try {
    const response = await docClient.send(command);
    console.log('getCurrentCount  response.Count: ', response.Count);
    return response.Count;
  } catch(err) {
    console.log('getCurrentCount: err: ', err);
    throw err;
  }
}

const addItem = async (docClient, keyPhoneNo, currentTime ) => {
  const currentTimeStr = currentTime.format('YYYY-MM-DD HH:mm:ss.sss');
  // add new item
  const putCommand = new PutCommand({
    TableName: messageLogTable,
    Item: {
      keyPhoneNo,
      sentAt: currentTimeStr
    }
  })
  const res = await docClient.send(putCommand);
  console.log('addItem res: ', res);
}

const addEntry = async (keyPhoneNo, rateConfig) => {
  console.log('addEntry: keyPhoneNo = ' + keyPhoneNo);
  console.log('addEntry: rateConfig: ', rateConfig);

  let result = false;
  try {
    const dbClient = new DynamoDBClient({region: 'ap-southeast-1'});
    const docClient = DynamoDBDocumentClient.from(dbClient);

    const currentTime = dayjs();
    const offsetStartTime = currentTime.subtract(rateConfig.perValue, rateConfig.perUnit);

    console.log('addEntry: rateConfig 2: ', rateConfig);
    const count = await getCurrentCount(
      docClient, 
      keyPhoneNo,
      currentTime, 
      offsetStartTime);
    console.log('addEntry: rateConfig 3: ', rateConfig);
    console.log('addEntry: rateConfig.perUnit = ' + rateConfig.perUnit);
    console.log('addEntry: rateConfig.perValue = ' + rateConfig.perValue);
    console.log('addEntry: rateConfig.quota = ' + rateConfig.quota);

    console.log('addEntry count: ' + count + ', rateConfig.quota = ' + rateConfig.quota);    

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
    console.log('addEntry: result =' + (result ? 'yes': 'no'));
    return result;
  } catch(err) {
    console.log('addEntry: err: ', err);
    return false;
  }
  return false;
}

module.exports = {
  addEntry,
  getRateConfig
}