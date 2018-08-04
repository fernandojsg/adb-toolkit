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

module.exports = {
  getDevices: getDevices,
  getDeviceProps: getDeviceProps,
  getDeviceInfo: getDeviceInfo,
  getPackages: getPackages,
  getPackageInfo: getPackageInfo
};