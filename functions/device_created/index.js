const http = require('http');
const Firestore = require('@google-cloud/firestore');
const firestore = new Firestore();

exports.onDeviceCreated = (event, context) => {
  const pubsubMessage = event.data;
  let objStr = Buffer.from(pubsubMessage, 'base64').toString()
  let msgObj = JSON.parse(objStr);
  let deviceId = msgObj.protoPayload.response.id;
  writeToFirestore(msgObj, deviceId)
  .then(() => console.log("Created device in firestore", deviceId))
  .catch(console.error);
};

function writeToFirestore(msgObj, deviceId) {
  let deviceRef = firestore.doc(`${process.env.DEVICE_COLLECTION}/${deviceId}`);
  let deviceConfigRef = firestore.doc(`${process.env.DEVICE_CONFIG_COLLECTION}/${deviceId}`);
  const mergeOption = {merge:true};
  deviceRef.set(createBasicDeviceDocument(msgObj), mergeOption);
  deviceConfigRef.set(createBasicDeviceConfigDocument(), mergeOption);
  return Promise.all([deviceStateRef, deviceConfigRef]);
}

function createBasicDeviceDocument(msgObj) {
  return {
    acl: {
      owner:[]
    },
    state: {
    },
    label: msgObj.resource.labels
  };
}

function createBasicDeviceConfigDocument() {
  return {
    config: {}
  };
}
