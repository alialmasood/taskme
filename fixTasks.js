
const admin = require('firebase-admin');

// ضع هنا بيانات الخدمة الخاصة بك (serviceAccount)
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixTasks() {
  const tasksRef = db.collection('tasks');
  const snapshot = await tasksRef.get();

  let count = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    let updateNeeded = false;
    const updateData = {};

    // تصحيح participants
    if (!Array.isArray(data.participants)) {
      updateData.participants = [];
      updateNeeded = true;
    }

    // تصحيح sharedWith
    if (!Array.isArray(data.sharedWith)) {
      updateData.sharedWith = [];
      updateNeeded = true;
    }

    if (updateNeeded) {
      await doc.ref.update(updateData);
      count++;
      console.log(`تم تصحيح المهمة: ${doc.id}`);
    }
  }
  console.log(`تم تصحيح ${count} مهمة بنجاح!`);
}

fixTasks().then(() => process.exit());