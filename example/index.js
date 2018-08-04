var adbtk = require('../src/index');

var devices = adbtk.getDevices();
console.log('========== DEVICES =========');
console.log(devices);

devices.forEach(device => {
  console.log('---------- DEVICE ----------');
  console.log(adbtk.getDeviceInfo(device.serial));
  console.log(adbtk.getDeviceProps(device.serial));
  console.log(adbtk.getPackages(device.serial));
  console.log(adbtk.getPackageInfo(device.serial, 'com.android.chrome'));
});