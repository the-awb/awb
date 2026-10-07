import {app} from 'electron';import {checkNativeReader} from './native.test.mjs';
app.setPath('userData','/private/tmp/awb-param-native-electron-profile');
app.whenReady().then(async()=>{try{await checkNativeReader();console.log('AWB_PARAM_ELECTRON_NATIVE_RESULT=PASS');app.exit(0)}catch(e){console.error(e);app.exit(1)}});
