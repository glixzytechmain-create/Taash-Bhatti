import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const outDir = path.join(root, 'dist-electron');
const appName = 'Taash Bhatti';
const bundleApp = path.join(outDir, `${appName}.app`);
const electronApp = path.join(root, 'node_modules/electron/dist/Electron.app');

console.log('1. Preparing output directory...');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

console.log('2. Cloning Electron template app...');
execSync(`cp -R "${electronApp}" "${bundleApp}"`);

console.log('3. Copying web assets and main process into Resources/app...');
const appResources = path.join(bundleApp, 'Contents/Resources/app');
fs.mkdirSync(appResources, { recursive: true });
execSync(`cp -R dist "${appResources}/dist"`);
execSync(`cp -R electron "${appResources}/electron"`);

fs.writeFileSync(
  path.join(appResources, 'package.json'),
  JSON.stringify({
    name: 'taash-bhatti',
    main: 'electron/main.cjs'
  }, null, 2)
);

console.log('4. Customizing App identity and Info.plist...');
const macOSDir = path.join(bundleApp, 'Contents/MacOS');
fs.renameSync(path.join(macOSDir, 'Electron'), path.join(macOSDir, appName));

const plistPath = path.join(bundleApp, 'Contents/Info.plist');
let plist = fs.readFileSync(plistPath, 'utf-8');
plist = plist.replace(/<string>Electron<\/string>/g, `<string>${appName}</string>`);
plist = plist.replace(/com\.github\.Electron/g, 'com.taashbhatti.app');
fs.writeFileSync(plistPath, plist);

try {
  execSync(`xattr -cr "${bundleApp}"`);
} catch (e) {}

console.log('5. Packaging native macOS DMG installer...');
const dmgPath = path.join(outDir, 'taash-bhatti.dmg');
execSync(`hdiutil create -volname "${appName}" -srcfolder "${bundleApp}" -ov -format UDZO "${dmgPath}"`);

console.log('6. Packaging native macOS PKG wizard installer...');
const pkgPath = path.join(outDir, 'taash-bhatti.pkg');
execSync(`pkgbuild --component "${bundleApp}" --install-location "/Applications" "${pkgPath}"`);

console.log('7. Copying DMG and PKG to ~/Downloads...');
const downloadsDir = path.join(process.env.HOME || '/Users/pratyush', 'Downloads');
execSync(`cp "${dmgPath}" "${downloadsDir}/taash-bhatti.dmg"`);
execSync(`cp "${pkgPath}" "${downloadsDir}/taash-bhatti.pkg"`);

console.log('Mac Build Complete!');
