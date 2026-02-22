const { cert, initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/FIREBASE_SERVICE_ACCOUNT_KEY='(.*)'/);
const keyJSON = match[1];

initializeApp({
    credential: cert(JSON.parse(keyJSON))
});

const adminDb = getFirestore();

async function check() {
    const sn = await adminDb.collection('sessions').get();
    console.log(`Found ${sn.size} sessions.`);
    sn.forEach(doc => {
        console.log("-", doc.id, doc.data().createdAt?.toDate());
    });
}

check().catch(console.error);
