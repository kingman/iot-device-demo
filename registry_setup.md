# Environment setup
Following code are execute from the Cloud Shell
## Set environment variables
```bash
export PROJECT_ID=<project_id>
export EVENT_TOPIC=lamp-event
export LOG_TOPIC=lamp-log
export STATE_TOPIC=lamp-state
export REGISTRY_ID=<registry_id>
export REGION=europe-west1
export GATEWAY_ID=hub
export DEVICE_PRE=lamp
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

## Create Gateway key pair
```bash
openssl genrsa -out $GATEWAY_PRIVATE_KEY 2048 && \
openssl rsa -in $GATEWAY_PRIVATE_KEY \
-pubout -out $GATEWAY_PUBLIC_KEY
```
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
# TODO: KAVI - OTHER SETUP INSTRUCTIONS?

# Deploy Communication Glue
We have several Cloud Functions which help pass messages between systems. Deploy these first.

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
TODO
```

## Create cloud function for storing events in Firestore
```bash
cd functions/event_update
```
Substitute the real project id with the `<project_id>` place holder in `index.js`
```bash
gcloud beta functions deploy eventUpdate \
--region $REGION \
--trigger-topic $LOG_TOPIC \
--runtime nodejs8 \
--memory 128mb
```

## Create cloud function for monitor Logging
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

## Create cloud function for sending Firestore updates to device
see setup instruction under `functions/firestore_update`

## Create cloud function for propegating device creation
```bash
TODO
```

# Start using the communications flow
## Test communication flow
```bash
TODO - SIMULATOR
```
Brows to [Cloud Functions Console](https://console.cloud.google.com/functions) and click on the `logging` function. Under 'logging' function click on `VIEW LOGS` to access the function log. Refresh the log and verify that connected message appears in the log.

## View Your udpates in Firestore
Go to Firestore in the GCP Console. Find your device in the devices list.

Try sending some data from the simulator - you should Firestore update instantly.

## Send information from Firestore
This represents an app sending data down to devices. Usually an SDK would write from a mobile app to Firestore.

Also in the document for your device in Firestore, navigate to the config collection and try updating one of the fields under state.

You should this information sent directly down to your device.

# Secure your flow
You can use Firebase to make sure that users can only read and update their own devices.

## Create firestore rule
```bash
TODO
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
TODO
```
## Try out custom logging
Use the simulator to send a log

```log INFO "testing"```

Check to see if it appears in Stackdriver

# Alerting on Logs
It's easy to create systems which raise alarms when certain log events occur. Simply deploy a CF which watches Stackdriver.

## Create cloud function to alert from stackdriver
```bash
TODO
```

# Agregate Monitoring
IoT Core roles up certain monitoring data for you, in the GCP console.

## View registry monitoring
Go to your IoT Core registry and click on the monitoring tab - you should be able to see devices connect, bytes uysed, and more.

----
