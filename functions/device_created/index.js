const http = require('http');
const Firestore = require('@google-cloud/firestore');
const firestore = new Firestore();

exports.onDeviceCreated = (event, context) => {
  const pubsubMessage = event.data;
  var objStr = Buffer.from(pubsubMessage, 'base64').toString()
  msgObj = JSON.parse(objStr);
  writeToFirestore(msgObj)
  .then(() => console.log("Created device in firestore", deviceId))
  .catch(console.error);
};

function writeToFirestore(msgObj) {
  deviceId = msgObj.protoPayload.response.id;
  let deviceStateRef = firestore.doc(`${process.env.deviceStateCollection}/${deviceId}`);
  let deviceConfigRef = firestore.doc(`${process.env.deviceConfigCollection}/${deviceId}`);
  deviceStateRef.set({
      acl:  {
        owner:[]
      },
      state: {
      },
      label: msgObj.resource.labels
    }, {merge:true});
    deviceConfigRef.set({
      config: {}
    }, {merge:true});
}
