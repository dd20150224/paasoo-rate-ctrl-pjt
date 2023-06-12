const { DynamoDBClient, BatchWriteItemCommand } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, UpdateCommand, QueryCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

const DEFAULT_CONFIG = {
  perValue: 1,
  perUnit: 'minute',
  quota: 5
}

const messageLogTable = process.env.DYNAMODB_MESSAGE_LOG_TABLE;

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

const addItem = async (docClient, keyPhoneNo, currentTime, executionMode ) => {
  const currentTimeStr = currentTime.format('YYYY-MM-DD HH:mm:ss.sss');
  try {
    const putCommand = new PutCommand({
      TableName: messageLogTable,
      Item: {
        keyPhoneNo,
        sentAt: currentTimeStr,
        mode: executionMode
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

const addEntry = async (keyPhoneNo, rateConfig, executionMode) => {
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
        currentTime,
        executionMode);
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
}