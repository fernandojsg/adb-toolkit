const shell = require('shelljs');

const adb = 'adb';
const options = {silent: true};

function getPackages(serial) {
  return shell.exec(`${adb} -s ${serial} shell 'pm list packages -f'`, options).stdout
    .trim()
    .replace(/package:/gi, '')
    .split('\n');
}

function getPackageInfo(serial, package) {
  return shell.exec(`${adb} shell dumpsys package ${package}`, options).stdout;
}

function getDevices() {
  var adbDevices = shell.exec(`${adb} devices -l`, options).stdout.trim().split('\n');
  adbDevices.shift();
  var devices = [];
  
  adbDevices.forEach(line => {
    const re =/([^\s]+).+device .+model:([^\s]+)\s/gi;
    var result = re.exec(line);
    devices.push({
      serial: result[1],
      deviceProduct: result[2]
    });
  });
  return devices;
}

function getDeviceProps(serial) {
  var output = shell.exec(`${adb} -s ${serial} shell getprop`, options).stdout.trim();

  var props = {};
  output.trim()
    .split('\n')
    .map(x => x.replace(/(\s|\[|\])/gi, '')
    .split(':'))
    .forEach(x => props[x[0]] = x[1]);
  return props;
}

function getDeviceInfo(serial) {
  var props = getDeviceProps(serial);

  return {
    serial: serial,
    android_version: props['ro.build.version.release'],
    sdk: props['ro.build.version.sdk'],
    device: props['ro.product.device'],
    manufacturer: props['ro.product.manufacturer'],
    model: props['ro.product.model'],
    name: props['ro.product.name']
    // @todo add friendly name: Oculus Go, Mirage Solo...
  };
}

function getBrowsers(browserCode) {
  var browsersData = [
    {
      name: 'Firefox Reality', 
      code: 'fxr', 
      package: 'org.mozilla.vrbrowser', 
      //launchCmd: 'adb shell am start -a android.intent.action.VIEW -d "{URL}" org.mozilla.vrbrowser/org.mozilla.vrbrowser.VRBrowserActivity'
      launchCmd: 'adb shell am start -n org.mozilla.vrbrowser/.VRBrowserActivity --es url "{URL}" --ez dom.vr.require-gesture false --ez privacy.reduceTimerPrecision false'
    },
    {
      name: 'Chrome', 
      code: 'chrome',
      package: 'com.android.chrome', 
      launchCmd: 'adb shell am start -n com.android.chrome/org.chromium.chrome.browser.ChromeTabbedActivity -d "{URL}" --activity-clear-task',
    },
    {
      name: 'Chrome Canary', 
      code: 'canary',
      package: 'com.chrome.canary', 
      launchCmd: 'adb shell am start -n com.android.canary/org.chromium.chrome.browser.ChromeTabbedActivity -d "{URL}" --activity-clear-task',
    },
    {
      name: 'Oculus Browser', 
      code: 'oculus',
      package: 'com.oculus.browser', 
      launchCmd: 'adb shell am start -n "com.oculus.vrshell/.MainActivity" -d apk://com.oculus.browser -e uri "{URL}"',
    }
  ];

  if (typeof browserCode !== 'undefined') {
    browsersData = browsersData.filter(browser => browser.code === browserCode);
  }

  var browserList = [];

  browsersData.forEach(browserData => {
    var packageVersions = getPackageVersions(null, browserData.package)
      .sort((a,b) => a.versionCode < b.versionCode)
      .map((info, i) => {
        info.code = browserData.code + (i > 0 ? info.versionName.split('.')[0] : '');
        return Object.assign({}, browserData, info); 
      });
      browserList = browserList.concat(packageVersions);
  });

  return browserList;
}

function launchUrl(url, selectedBrowser) {
  var browser = typeof selectedBrowser === 'undefined' ? getBrowsers()[0] : getBrowsers(selectedBrowser)[0];
  if (!browser) {
    console.log('No browser found');
    return;
  }

  var cmd = browser.launchCmd.replace('{URL}', url.replace(/&/gi, '\\&'));
  console.log('Command: ', cmd);
  const output = shell.exec(cmd, options);
}

function getPackageVersions(serial, package) {
  var output = getPackageInfo(serial, package);
  var result = [];

  if (output.trim().length) {
    const re = /versionCode=(\d+).+\n.+versionName=(.+)/gmi;
    while (res = re.exec(output)) {
      const versionCode = res[1];
      const versionName = res[2];

      result.push({
        versionCode: versionCode,
        versionName: versionName
      });
    }
  }
  return result;
}

function forceStop(package, callback) {
  const output = shell.exec(`adb shell am force-stop ${package}`, {}, callback);
}

module.exports = {
  getDevices: getDevices,
  getDeviceProps: getDeviceProps,
  getDeviceInfo: getDeviceInfo,
  getPackages: getPackages,
  getPackageInfo: getPackageInfo,
  getPackageVersions: getPackageVersions,
  getBrowsers: getBrowsers,
  launchUrl: launchUrl,
  forceStop: forceStop
};