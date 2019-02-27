const Firestore = require('@google-cloud/firestore');
const firestore = new Firestore();

exports.eventUpdate = (event, context) => {
  const pubsubMessage = event.data;
  const deviceId = event.attributes.deviceId;
  var msgObj = JSON.parse(Buffer.from(pubsubMessage, 'base64').toString());
  writeToFirestore(deviceId, msgObj)
  .then(() => console.log("Value written to firestore for device: %s", deviceId))
  .catch(console.error);
};

function writeToFirestore(deviceId, data) {
  let documentRef = firestore.doc(`devices/${deviceId}`);
  return documentRef.set(data, {merge:true});
}
