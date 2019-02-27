## Deploy update
```bash
mkdir firestore_upate
cd firestore_update
npm install firebase-functions@latest firebase-admin@latest --save
npm install -g firebase-tools
firebase login
firebase init functions
```
Override the `index.js`  functions with the one in this directory and also make sure to substitute `<project_d>` and  `<registry_id>`
```bash
firebase deploy --only functions
```
