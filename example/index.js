var adbtk = require('../src/index');

var devices = adbtk.getDevices();
console.log('========== DEVICES =========');
console.log(devices);

devices.forEach(device => {
  console.log('---------- DEVICE ----------');
  console.log(device.getInfo());
  console.log(device.getPackageVersions('com.android.chrome'));
  console.log(device.getDeviceProps());
  console.log(device.getPackages());
  console.log(device.getPackageInfo('org.mozilla.vrbrowser'));
  console.log('Browsers', device.getBrowsers());
  
  console.log('Launch browser');
  device.launchUrl('http://fernandojsg.com', 'fxr')
  
  setTimeout(() => {
    device.forceStop('org.mozilla.vrbrowser');
  }, 8000);
});