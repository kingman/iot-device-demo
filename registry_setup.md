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
## Create cloud function for storing state in Firestore
```bash 
TODO
```

## Create cloud function for sending Firestore updates to device
```bash
TODO
```

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
Browse to Firestore...

## Send information from Firestore
This represents an app sending information

# Secure your flow


