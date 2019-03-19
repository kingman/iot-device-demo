const functions = require('firebase-functions');
const iot = require('@google-cloud/iot');
const client = new iot.v1.DeviceManagerClient();

exports.onFirestoreUpdate = functions.firestore
  .document('${functions.config().deviceStore.configDatabase}/{deviceId}')
  .onUpdate((change, context) => {
    let newValue = change.after.data();
    let data = JSON.stringify(newValue, null, 2);
    return updateDeviceConfig(context.params.deviceId, data);
  });

function updateDeviceConfig(deviceId, data) {
  let formattedName = client.devicePath('${functions.config().iotCore.projectId}', '${functions.config().iotCore.region}', '${functions.config().iotCore.registry}', deviceId);
  let binaryData = Buffer.from(data).toString('base64');
  let request = {
    name: formattedName,
    binaryData: binaryData
  };
  return client.modifyCloudToDeviceConfig(request);
}
