/**
 * Skripta za analizo uporabe aplikacije MediForm.
 * Analizira:
 * - število uporabnikov,
 * - število ustvarjenih poročil,
 * - pogostost uporabe,
 * - aktivne uporabnike po dnevih.
 */

const admin = require('firebase-admin');
const fs = require('fs');

// Inicializacija Firebase Admin SDK
const serviceAccount = require('./path-to-firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'mediform-73012'
});

const db = admin.firestore();

/**
 * Funkcija: skupno število uporabnikov
 */
async function getTotalUsers() {
  try {
    const snapshot = await db.collection('users').get();
    return snapshot.size;
  } catch (error) {
    console.error('Napaka pri štetju uporabnikov:', error);
    return 0;
  }
}

/**
 * Funkcija: skupno število ustvarjenih poročil
 */
async function getTotalSubmissions() {
  try {
    const snapshot = await db.collection('submissions').get();
    return snapshot.size;
  } catch (error) {
    console.error('Napaka pri štetju poročil:', error);
    return 0;
  }
}

/**
 * Funkcija: število poročil na uporabnika
 */
async function getSubmissionsPerUser() {
  try {
    const submissionsSnapshot = await db.collection('submissions').get();
    const submissionsPerUser = {};

    submissionsSnapshot.forEach((doc) => {
      const data = doc.data();
      const userId = data.userId || doc.id.split('_')[0];

      if (!submissionsPerUser[userId]) {
        submissionsPerUser[userId] = 0;
      }
      submissionsPerUser[userId]++;
    });

    return submissionsPerUser;
  } catch (error) {
    console.error('Napaka pri analizi poročil po uporabnikih:', error);
    return {};
  }
}

/**
 * Funkcija: aktivnost po dnevih
 */
async function getActivityByDay() {
  try {
    const snapshot = await db.collection('submissions').get();
    const activityByDay = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      const timestamp = data.createdAt || data.updatedAt;

      if (timestamp) {
        const date = new Date(timestamp.toDate ? timestamp.toDate() : timestamp);
        const dateString = date.toISOString().split('T')[0];

        if (!activityByDay[dateString]) {
          activityByDay[dateString] = 0;
        }
        activityByDay[dateString]++;
      }
    });

    return activityByDay;
  } catch (error) {
    console.error('Napaka pri analizi dnevne aktivnosti:', error);
    return {};
  }
}

/**
 * Funkcija: aktivni uporabniki
 */
async function getActiveUsers() {
  try {
    const submissionsPerUser = await getSubmissionsPerUser();
    return Object.keys(submissionsPerUser).length;
  } catch (error) {
    console.error('Napaka pri štetju aktivnih uporabnikov:', error);
    return 0;
  }
}

/**
 * Funkcija: povprečno število poročil na uporabnika
 */
async function getAverageSubmissionsPerUser() {
  try {
    const totalUsers = await getTotalUsers();
    const totalSubmissions = await getTotalSubmissions();

    if (totalUsers === 0) return 0;
    return (totalSubmissions / totalUsers).toFixed(2);
  } catch (error) {
    console.error('Napaka pri izračunu povprečja:', error);
    return 0;
  }
}

/**
 * Glavna analiza - izpis vseh statistik
 */
async function analyzeUsage() {
  console.log('\n===== ANALIZA UPORABE MEDIFORM =====\n');

  const totalUsers = await getTotalUsers();
  const totalSubmissions = await getTotalSubmissions();
  const activeUsers = await getActiveUsers();
  const avgSubmissions = await getAverageSubmissionsPerUser();
  const submissionsPerUser = await getSubmissionsPerUser();
  const activityByDay = await getActivityByDay();

  console.log('STATISTIKA UPORABNIKOV:');
  console.log(`- Skupno število uporabnikov: ${totalUsers}`);
  console.log(`- Aktivni uporabniki (z vsaj enim poročilom): ${activeUsers}`);
  console.log(`- Delež aktivnih uporabnikov: ${totalUsers ? ((activeUsers / totalUsers) * 100).toFixed(1) : 0}%`);

  console.log('\nSTATISTIKA POROČIL:');
  console.log(`- Skupno število poročil: ${totalSubmissions}`);
  console.log(`- Povprečno število poročil na uporabnika: ${avgSubmissions}`);

  console.log('\nNAJAKTIVNEJŠI UPORABNIKI:');
  const topUsers = Object.entries(submissionsPerUser)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  topUsers.forEach(([userId, count], index) => {
    console.log(`${index + 1}. Uporabnik ${userId}: ${count} poročil`);
  });

  console.log('\nAKTIVNOST PO DNEVIH:');
  const sortedDays = Object.entries(activityByDay).sort();
  sortedDays.slice(-7).forEach(([day, count]) => {
    console.log(`- ${day}: ${count} poročil`);
  });

  const report = {
    timestamp: new Date().toISOString(),
    totalUsers,
    activeUsers,
    percentageActive: totalUsers ? ((activeUsers / totalUsers) * 100).toFixed(1) : '0.0',
    totalSubmissions,
    averageSubmissionsPerUser: avgSubmissions,
    topUsers: topUsers.map(([userId, count]) => ({ userId, count })),
    activityByDay: Object.fromEntries(sortedDays),
    dataQualityScore: calculateDataQuality(submissionsPerUser, totalSubmissions)
  };

  fs.writeFileSync(
    './usage_analysis_report.json',
    JSON.stringify(report, null, 2)
  );

  console.log('\nAnaliza je bila uspešno shranjena v datoteko usage_analysis_report.json\n');

  return report;
}

/**
 * Funkcija: ocena kakovosti podatkov
 */
function calculateDataQuality(submissionsPerUser, totalSubmissions) {
  if (totalSubmissions === 0) return 0;

  const userCount = Object.keys(submissionsPerUser).length;
  if (userCount === 0) return 0;

  const avgSubmissions = totalSubmissions / userCount;
  const score = Math.min(100, Math.round((avgSubmissions / 10) * 100));

  return score;
}

analyzeUsage()
  .then(() => {
    console.log('Analiza je končana.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Kritična napaka:', error);
    process.exit(1);
  });

module.exports = {
  getTotalUsers,
  getTotalSubmissions,
  getSubmissionsPerUser,
  getActivityByDay,
  getActiveUsers,
  getAverageSubmissionsPerUser,
  analyzeUsage
};
