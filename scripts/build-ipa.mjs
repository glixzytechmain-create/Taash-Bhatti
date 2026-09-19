import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const deliverablesDir = path.join(root, 'build-deliverables');
const downloadsDir = path.join(process.env.HOME || '/Users/pratyush', 'Downloads');
const tempIpaDir = path.join(deliverablesDir, 'ipa-build');
const derivedDataPath = path.join(root, 'build-ios');

console.log('1. Syncing Capacitor iOS...');
execSync('npx cap sync ios', { stdio: 'inherit' });

console.log('2. Compiling native iOS app with xcodebuild...');
fs.rmSync(derivedDataPath, { recursive: true, force: true });
execSync(
  `xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -destination "generic/platform=iOS" -derivedDataPath "${derivedDataPath}" CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" clean build`,
  { stdio: 'inherit' }
);

console.log('3. Packaging Payload into .ipa archive...');
const appPath = path.join(derivedDataPath, 'Build/Products/Release-iphoneos/App.app');
const payloadDir = path.join(tempIpaDir, 'Payload');

fs.rmSync(tempIpaDir, { recursive: true, force: true });
fs.mkdirSync(payloadDir, { recursive: true });
execSync(`cp -R "${appPath}" "${payloadDir}/"`);

const ipaPath = path.join(deliverablesDir, 'taash-bhatti.ipa');
execSync(`cd "${tempIpaDir}" && zip -r -y "${ipaPath}" Payload`);
fs.rmSync(tempIpaDir, { recursive: true, force: true });

console.log('4. Archiving dSYM debug symbols...');
const dsymPath = path.join(derivedDataPath, 'Build/Products/Release-iphoneos/App.app.dSYM');
const dsymZipPath = path.join(deliverablesDir, 'taash-bhatti.app.dSYM.zip');
if (fs.existsSync(dsymPath)) {
  execSync(`cd "${path.dirname(dsymPath)}" && zip -r -y "${dsymZipPath}" "${path.basename(dsymPath)}"`);
}

console.log('5. Copying deliverables to ~/Downloads...');
fs.mkdirSync(downloadsDir, { recursive: true });
fs.copyFileSync(ipaPath, path.join(downloadsDir, 'taash-bhatti.ipa'));
if (fs.existsSync(dsymZipPath)) {
  fs.copyFileSync(dsymZipPath, path.join(downloadsDir, 'taash-bhatti.app.dSYM.zip'));
}

console.log('6. Cleaning up temporary build directory...');
fs.rmSync(derivedDataPath, { recursive: true, force: true });

console.log('iOS IPA Build Complete!');
console.log(`Deliverables:`);
console.log(`- ${ipaPath}`);
console.log(`- ${path.join(downloadsDir, 'taash-bhatti.ipa')}`);
