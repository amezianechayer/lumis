const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '../node_modules/react-native-purchases-ui/android/src/main/java/com/revenuecat/purchases/react/ui');

function patch(file, replacements) {
  const filePath = path.join(BASE, file);
  if (!fs.existsSync(filePath)) {
    console.log('[fix-purchases-ui] not found, skipping:', file);
    return;
  }
  let src = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [from, to] of replacements) {
    if (src.includes(from)) {
      src = src.split(from).join(to);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, src, 'utf8');
    console.log('[fix-purchases-ui] patched:', file);
  } else {
    console.log('[fix-purchases-ui] already patched:', file);
  }
}

patch('RNPaywallsModule.kt', [
  [
    'return when (val currentActivity = reactApplicationContext.currentActivity)',
    'val _act = reactApplicationContext.getCurrentActivity()\n            return when (_act)',
  ],
  ['is FragmentActivity -> currentActivity', 'is FragmentActivity -> _act'],
]);

patch('RNCustomerCenterModule.kt', [
  ['reactApplicationContext.currentActivity?.', 'reactApplicationContext.getCurrentActivity()?.'],
]);
