const http = require('http');
const Firestore = require('@google-cloud/firestore');
const firestore = new Firestore();

const HAWKBIT_NOTIFICATION_URL = "http://ota.gcp-iot-demo.com:8083/gcp";

exports.onDeviceCreate = (event, context) => {
  const pubsubMessage = event.data;
  var objStr = Buffer.from(pubsubMessage, 'base64').toString()
  console.log(objStr);

  const req = http.request(HAWKBIT_NOTIFICATION_URL, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  	res.on('end', () => {
      console.log('Successfully notified Hawkbit')
    })
  })
  .on('error', console.error)
  .end();

  var msgObj = JSON.parse(objStr);

  deviceId = msgObj.protoPayload.response.id;
  writeToFirestore(deviceId)
  .then(() => console.log("Created device in firestore", deviceId))
  .catch(console.error);
};

function writeToFirestore(deviceId) {
  let documentRef = firestore.doc(`devices/${deviceId}`);
  return documentRef.set({
      acl:  {
        owner:[]
      },
      state: {
        color: "",
        onOff: "ON"
      }
    }, {merge:true});
}
