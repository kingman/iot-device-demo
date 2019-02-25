#!/usr/bin/env python

# Copyright 2018 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#         http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
import paho.mqtt.client as mqtt
import utilities
import ssl
import time
import json
import re

def error_str(rc):
    return '{}: {}'.format(rc, mqtt.error_string(rc))

def on_disconnect(unused_client, unused_userdata, rc):
    print('on_disconnect', error_str(rc))

def on_connect(unused_client, userdata, flags, rc):
    print("Connected flags"+str(flags)+"result code "+str(rc)+"client1_id ")

def on_message(unused_client, unused_userdata, message):
    """Callback when the device receives a message on a subscription."""
    payload = str(message.payload)
    messageType = 'message'
    if(re.match(
            r'/devices/[A-Za-z0-9_-]+/errors', message.topic, re.M | re.I)):
        messageType = 'ERROR ' + messageType
    print('Received {} \'{}\' on topic \'{}\' with Qos {}'.format(
        messageType, payload, message.topic, str(message.qos)))

class MQTTClient(object):
    mqtt_bridge_hostname = 'mqtt.googleapis.com'
    mqtt_bridge_port = 8883
    connected = False

    def __init__(self, project_id, registry_id, device_id, private_key_file, cloud_region, ca_certs, algorithm):
        self.project_id = project_id
        self.client = mqtt.Client(
            client_id=('projects/{}/locations/{}/registries/{}/devices/{}'
                   .format(
                           project_id,
                           cloud_region,
                           registry_id,
                           device_id)))
        self.client.username_pw_set(
            username='unused',
            password=utilities.create_jwt(
                project_id, private_key_file, algorithm))
        self.client.tls_set(ca_certs=ca_certs, tls_version=ssl.PROTOCOL_TLSv1_2)
        self.client.on_connect = on_connect
        self.client.on_disconnect = on_disconnect
        self.client.on_message = on_message

    def create_jwt(self, private_key_file, algorithm):
        return utilities.create_jwt(
            self.project_id, private_key_file, algorithm)

    def attach_device(self, device_id, private_key_file=None, algorithm=None):
        attach_topic = '/devices/{}/attach'.format(device_id)
        attach_payload = {}
        if private_key_file:
            attach_payload['authorization'] = self.create_jwt(
                private_key_file,algorithm)
        self.client.loop()
        self.client.publish(attach_topic, json.dumps(attach_payload), qos=1)
        time.sleep(5)

    def detach_device(self, device_id):
        detach_topic = '/devices/{}/detach'.format(device_id)
        print('Detaching: {}'.format(detach_topic))
        self.client.loop()
        self.client.publish(detach_topic, '{}', qos=1)
        time.sleep(5)  # wait for the server to respond / will trigger callback
        # [END detach_device]

    def subscribe_to_error_msg(self, device_id):
        error_topic = '/devices/{}/errors'.format(device_id)
        self.client.subscribe(error_topic, qos=0)

    def connect_to_server(self):
        self.client.connect(self.mqtt_bridge_hostname, self.mqtt_bridge_port)
        self.connected = True

    def disconnect_from_server(self):
        self.client.disconnect()
        self.connected = False

    def _send(self, topic, msg):
        self.client.loop()
        msgInfo = self.client.publish(topic, msg, qos=1)

    def send_event(self, device_id, msg, sub_topic=None):
        topic = '/devices/{}/events'.format(device_id)
        if sub_topic:
            topic = '{}/{}'.format(topic, sub_topic)
        print('sending topic {}'.format(topic))
        self._send(topic, msg)


    def send_state(self, device_id, msg):
        topic = '/devices/{}/state'.format(device_id)
        self._send(topic, msg)
