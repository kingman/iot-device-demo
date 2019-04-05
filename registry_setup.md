# Environment setup
Following code are execute from the Cloud Shell
## Set environment variables
```bash
export PROJECT_ID=$(gcloud config list project --format "value(core.project)")
export EVENT_TOPIC=lamp-event
export LOG_TOPIC=lamp-log
export STATE_TOPIC=lamp-state
export REGISTRATION_TOPIC=registration-events
export REGISTRY_ID=<registry_id>
export REGION=europe-west1
export GATEWAY_ID=hub123
export DEVICE_PRE=lamp123
export GATEWAY_PRIVATE_KEY=gateway_private.pem
export GATEWAY_PUBLIC_KEY=gateway_public.pem
export DEVICE_PRIVATE_KEY=device_private.pem
export DEVICE_PUBLIC_KEY=device_public.pem
export CA_CERTS=roots.pem
export ALGORITHM=RS256

# Project Setup
Run these commands to get IoT Core and other GCP services setup
```
## Create Pub/Sub topics
```bash
gcloud pubsub topics create $LOG_TOPIC
gcloud pubsub topics create $STATE_TOPIC
gcloud pubsub topics create $EVENT_TOPIC
gcloud pubsub topics create $REGISTRATION_TOPIC
```

## Create IoT Core registry from CLI - Use Cloud Shell
```bash
gcloud iot registries create $REGISTRY_ID \
--region $REGION \
--event-notification-config=subfolder=log,topic=$LOG_TOPIC \
--event-notification-config=topic=$EVENT_TOPIC \
--state-pubsub-topic=$STATE_TOPIC
```

# Simulator Setup
We will use a node.js device simulator. This will get it setup.

## Pull the code and install dependencies
```bash
git clone https://github.com/ionia-corporation/gcp-iot-simulator
cd gcp-iot-simulator
npm install
```

Then see that its working correctly, even though we still need to configure
```bash
npm start --
```

## Create Gateway key pair
```bash
openssl genrsa -out $GATEWAY_PRIVATE_KEY 2048 && \
openssl rsa -in $GATEWAY_PRIVATE_KEY \
-pubout -out $GATEWAY_PUBLIC_KEY
```

## Create gateway where device connect through association
```bash
gcloud iot devices create $GATEWAY_ID \
--device-type=gateway \
--region=$REGION \
--registry=$REGISTRY_ID \
--public-key=path=$GATEWAY_PUBLIC_KEY,type=rsa-pem \
--auth-method=association-only
```

## Create device without key and bind it to gateway
```bash
gcloud iot devices create "${DEVICE_PRE}1" \
--region=$REGION \
--registry=$REGISTRY_ID && \
gcloud iot devices gateways bind \
--device="${DEVICE_PRE}1" \
--device-region=$REGION \
--device-registry=$REGISTRY_ID \
--gateway=$GATEWAY_ID \
--gateway-region=$REGION \
--gateway-registry=$REGISTRY_ID
```
## Setup the configuration files for your gateway simulator
Create a file called `gateway-config.json` and paste in the following.

Replace the project ID, region, registry ID, and device ID fields. Make sure you are using your "gateway" ID and keyfile from before.

```
{
  "projectId": "PROJECT_ID",
  "region": "REGION",
  "registryId": "REGISTRY_ID",
  "type": "gateway",
  "deviceId": "DEVICE_ID[GATEWAY]",
  "privateKeyFile": "./gateway_private.pem",
  "algorithm": "RS256"
}
```

## Setup the configuration files for your gateway client (device) simulator
Create a file called `gateway-client-config.json` and paste in the following.

Replace the project ID, region, registry ID, and device ID fields. Make sure you are using your "device_pre" ID from before.

```
{
  "projectId": "PROJECT_ID",
  "region": "REGION",
  "registryId": "REGISTRY_ID",
  "type": "gateway-client",
  "deviceId": "DEVICE_ID",
  "algorithm": "RS256"
}
```

## Test your simulator
Test the keys in the gateway simulator

```bash
npm start -- ./gateway-config.json
```

You should see messages about the MQTT connection.

# Deploy Communication Glue
We have several Cloud Functions which help pass messages between systems. Deploy these first.

## Device creation flow
```bash
export DEVICE_CREATED_TOPIC=iot-device-created
export DEVICE_CREATED_SINK_ID=device-created-log-sink
```
Create PubSub topic that holds device created event
```bash
gcloud pubsub topics create ${DEVICE_CREATED_TOPIC}
```
Create log sink that looks for device creation in the log and writes to the Pub/Sub event
```bash
gcloud logging sinks create ${DEVICE_CREATED_SINK_ID} \
pubsub.googleapis.com/projects/${PROJECT_ID}/topics/${DEVICE_CREATED_TOPIC} \
--log-filter='resource.type="cloudiot_device" AND protoPayload.methodName="google.cloud.iot.v1.DeviceManager.CreateDevice"'
```
Give the service account right to publish to the newly created topic
```bash
export DEVICE_CREATED_SINK_ACCOUNT=$(gcloud logging sinks describe ${DEVICE_CREATED_SINK_ID} --format "value(writerIdentity)")
gcloud beta pubsub topics add-iam-policy-binding ${DEVICE_CREATED_TOPIC} --member=${DEVICE_CREATED_SINK_ACCOUNT} --role=roles/pubsub.publisher
```
Deploy Cloud Functions that listens to that topic and create corresponding document in firestore
```bash
cd ~/iot-device-demo/functions/device_created
gcloud functions deploy onDeviceCreated \
--set-env-vars DEVICE_COLLECTION=devices,\
DEVICE_CONFIG_COLLECTION=deviceConfigs \
--region ${REGION} \
--trigger-topic ${DEVICE_CREATED_TOPIC} \
--runtime nodejs8 \
--memory 128mb
```
## Create cloud function for debugging device activity
```bash
cd functions/logging
gcloud beta functions deploy logging \
--region $REGION \
--trigger-topic $LOG_TOPIC \
--runtime nodejs8 \
--memory 128mb
```

## Create cloud function for storing events in Firestore
```bash
cd functions/event_update
```
Substitute the real project id with the `<project_id>` place holder in `index.js`
```bash
gcloud beta functions deploy eventUpdate \
--region $REGION \
--trigger-topic $EVENT_TOPIC \
--runtime nodejs8 \
--memory 128mb
```

## Create cloud function for sending Firestore updates to device
```bash
mkdir firestore_update
cd firestore_update
npm install -g firebase-tools
firebase login
firebase init functions --project $PROJECT_ID
cd functions
cp ~/iot-device-demo/functions/firestore_update/index.js index.js
npm install firebase-functions@latest firebase-admin@latest @google-cloud/iot@latest
```
Set function configurations
```bash
firebase functions:config:set \
device.database.name="deviceConfig" \
iot.core.projectid=$PROJECT_ID \
iot.core.region=$REGION \
iot.core.registry=$REGISTRY_ID
```
Deploy the function
```bash
cd ..
firebase deploy --only functions
```

## Create a log export to track new devices
Go to "Logging" in the console. Click "Create Export". Select "Cloud Pub/Sub". Select the "registration-event" pub/sub topic.

## Create cloud function for propegating device creation
```bash
cd functions/create_firestore_device
gcloud beta functions deploy onDeviceCreate \
--region $REGION \
--trigger-topic registration-events \
--runtime nodejs8 \
--memory 128mb
```

# Start using the communications flow
## Start your gateway simulator
```bash
npm start -- ./gateway-config.json
```

Once you see the simulator is connected, the gateway should be ready. You can run `help` to see more options. But lets get the other device runing first.

## Start another simulator as the gateway client (device)
```bash
npm start -- ./gateway-client-config.json
```

A few things will happen when you do this. A new device will connect to the gateway on the local machine and the gateway will 'attach' this device.

## Test communication flow
Publish a message from the end device, through the gateway.

With your simulator running, do the following at the REPL.
```bash
event "test" "hello world"
```
You should see the publish in the console. Check the gateways tab, you should see it there as well.

Browse to [Cloud Functions Console](https://console.cloud.google.com/functions) and click on the `logging` function. Under 'logging' function click on `VIEW LOGS` to access the function log. Refresh the log and verify that connected message appears in the log.

## View Your udpates in Firestore
Go to Firestore in the GCP Console. Find your device in the devices list.

You shold see the same "test" field with the "hello world" value.

Try updating one of the existing values.

## Send information from Firestore
This represents an app sending data down to devices. Usually an SDK would write from a mobile app to Firestore.

Also in the document for your device in Firestore, navigate to the config collection and try updating one of the fields under state.

You should this information sent directly down to your device.

# Secure your flow
You can use Firebase to make sure that users can only read and update their own devices.

## Create firestore rule
```bash
{
  "rules": {
    "posts": {
       "$uid": {
         ".read": "$uid === auth.uid",
         ".write": "$uid === auth.uid"
       }
     }
   }
}
```

## Test secure communicaiton
We have added an ACL field to the firestore document which can contain an email, if set only a user signed in with this email would be to udpate and view these fields.

---

# Setup device logging
IoT Core can write device activity information to Stakdrvier logging for you.

## Turn on logging for your registry
1. Go to your IoT Core registry
2. Click "Edit Registry"
3. Set "Logging Level" to "Info"

## Try it out
Restart your device simulator. Now go to Stackdriver Logging and see the device events.

# Custom Logging
You can also use the IoT Core event channel to send custom logs from the device and have them appear in stack driver

## Create cloud function for sending logs to Stackdriver
```bash
cd functions/monitor_logging
```
Substitute the real project id with the `<project_id>` place holder in `index.js`
```bash
gcloud beta functions deploy monitorLogging \
--region $REGION \
--trigger-topic $LOG_TOPIC \
--runtime nodejs8 \
--memory 128mb
```
## Try out custom logging
Use the simulator to send a log. Try the following in the log repl.

```bash
log INFO "testing"
```

Check to see if it appears in Stackdriver

# Alerting on Logs
It's easy to create systems which raise alarms when certain log events occur. Simply deploy a CF which watches Stackdriver.

See the documentation here: https://cloud.google.com/logging/docs/export/

We could export logs to BigQuery or to Pub/Sub. If to Pub/Sub we can make a simple function to alert on them.

## Create Pub/Sub Sink
Click on "Create Export" and Select Pub/Sub.

# Agregate Monitoring
IoT Core roles up certain monitoring data for you, in the GCP console.

## View registry monitoring
Go to your IoT Core registry and click on the monitoring tab - you should be able to see devices connect, bytes uysed, and more.

## Clean up
```bash
gcloud functions delete onDeviceCreated --region ${REGION} -q
gcloud logging sinks delete ${DEVICE_CREATED_SINK_ID} -q
gcloud pubsub topics delete ${DEVICE_CREATED_TOPIC} -q
```

----

# OTA Setup Instructions
## Charbel to add



----

# Old Instrucitons - DO NOT USE

## Create Device key pair
```bash
openssl genrsa -out $DEVICE_PRIVATE_KEY 2048 && \
openssl rsa -in $DEVICE_PRIVATE_KEY \
-pubout -out $DEVICE_PUBLIC_KEY
```
## Create gateway where device connect through association
```bash
gcloud iot devices create $GATEWAY_ID \
--device-type=gateway \
--region=$REGION \
--registry=$REGISTRY_ID \
--public-key=path=$GATEWAY_PUBLIC_KEY,type=rsa-pem \
--auth-method=association-only
```
