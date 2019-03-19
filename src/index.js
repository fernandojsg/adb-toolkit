const shell = require('shelljs');

const adb = 'adb';
var options = {silent: true};

function getDevices(opt) {
  if (typeof opt !== 'undefined') {
    options = opt;
  }

  var adbDevices = shell.exec(`${adb} devices -l`, options).stdout.trim().split('\n');
  adbDevices.shift();
  var devices = [];
  
  adbDevices.forEach(line => {
    const re =/([^\s]+).+device .+model:([^\s]+)\s/gi;
    var result = re.exec(line);
    devices.push(new ADBDevice(result[1], result[2]));
  });
  return devices;
}


function ADBDevice(serial, deviceProduct) {
  this.serial = serial;
  this.deviceProduct = deviceProduct;
}

ADBDevice.prototype = {
  getInfo: function() {
    var props = this.getDeviceProps();
  
    return {
      serial: this.serial,
      android_version: props['ro.build.version.release'],
      sdk: props['ro.build.version.sdk'],
      device: props['ro.product.device'],
      manufacturer: props['ro.product.manufacturer'],
      model: props['ro.product.model'],
      name: props['ro.product.name']
      // @todo add friendly name: Oculus Go, Mirage Solo...
    };
  },
  getPackageVersions: function(package) {
    var output = this.getPackageInfo(package);
    var result = [];
  
    if (output.trim().length) {
      const re = /versionCode=(\d+).+[\s\S]+.+versionName=(.+)/gmi;
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
  },
  getPackages: function() {
    return shell.exec(`${adb} -s ${this.serial} shell 'pm list packages -f'`, options).stdout
      .trim()
      .replace(/package:/gi, '')
      .split('\n');
  },
  getPackageInfo(package) {
    return shell.exec(`${adb} -s ${this.serial} shell dumpsys package ${package}`, options).stdout;
  },
  getDeviceProps: function() {
    var output = shell.exec(`${adb} -s ${this.serial} shell getprop`, options).stdout.trim();
  
    var props = {};
    output.trim()
      .split('\n')
      .map(x => x.replace(/(\s|\[|\])/gi, '')
      .split(':'))
      .forEach(x => props[x[0]] = x[1]);
    return props;
  },
  getBrowsers: function(browserCode) {
    var browsersData = [
      {
        name: 'Firefox Reality', 
        code: 'fxr', 
        package: 'org.mozilla.vrbrowser', 
        //launchCmd: `${adb} -s ${this.serial} shell am start -a android.intent.action.VIEW -d "{URL}" org.mozilla.vrbrowser/org.mozilla.vrbrowser.VRBrowserActivity`
        launchCmd: `${adb} -s ${this.serial} shell am start -n org.mozilla.vrbrowser/.VRBrowserActivity --es url "{URL}" --ez dom.vr.require-gesture false --ez privacy.reduceTimerPrecision false`
      },
      {
        name: 'Chrome', 
        code: 'chrome',
        package: 'com.android.chrome', 
        launchCmd: `${adb} -s ${this.serial} shell am start -n com.android.chrome/org.chromium.chrome.browser.ChromeTabbedActivity -d "{URL}" --activity-clear-task -c com.google.intent.category.DAYDREAM`
      },
      {
        name: 'Chrome Canary', 
        code: 'canary',
        package: 'com.chrome.canary', 
        launchCmd: `${adb} -s ${this.serial} shell am start -n com.chrome.canary/org.chromium.chrome.browser.ChromeTabbedActivity -d "{URL}" --activity-clear-task -c com.google.intent.category.DAYDREAM`
      },
      {
        name: 'Oculus Browser', 
        code: 'oculus',
        package: 'com.oculus.browser', 
        launchCmd: `${adb} -s ${this.serial} shell am start -n "com.oculus.vrshell/.MainActivity" -d apk://com.oculus.browser -e uri "{URL}"`
      }
    ];
  
    if (typeof browserCode !== 'undefined') {
      browsersData = browsersData.filter(browser => browser.code === browserCode);
    }
  
    var browserList = [];
  
    browsersData.forEach(browserData => {
      var packageVersions = this.getPackageVersions(browserData.package)
        .sort((a,b) => a.versionCode < b.versionCode);
      if (packageVersions.length !== 0) {
        browserList.push(Object.assign({}, browserData, packageVersions[0]));
      }
    });
  
    return browserList;
  },
  existPackage: function(packageFilename) {
    return shell.exec(`${adb} -s ${this.serial} shell pm list packages|grep ${packageFilename}`).trim().length > 0;
  },
  installPackage: function(packageFilename, callback) {
    const output = shell.exec(`${adb} -s ${this.serial} install ${packageFilename}`, {}, callback);
  },
  uninstallPackage: function(packageName, callback) {
    const output = shell.exec(`${adb} -s ${this.serial} uninstall ${packageName}`, {}, callback);
  },
  launchUrl: function(url, selectedBrowser, extraParams) {
    var browser = typeof selectedBrowser === 'undefined' ? this.getBrowsers()[0] : this.getBrowsers(selectedBrowser)[0];
    if (!browser) {
      // console.log('No browser found');
      return false;
    }

    //var cmd = browser.launchCmd.replace('{URL}', url) + (extraParams ? extraParams : '');
    var cmd = browser.launchCmd.replace('{URL}', url) + (extraParams ? extraParams : '');
    if (options.debug) {
      console.log('shell.exec: ', cmd);
    }

    const output = shell.exec(cmd, options);
  },
  forceStop: function(package, callback) {
    const output = shell.exec(`${adb} -s ${this.serial} shell am force-stop ${package}`, {}, callback);
  }
}

module.exports = {
  getDevices: getDevices
};