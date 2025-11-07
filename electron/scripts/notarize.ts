import { notarize } from '@electron/notarize/lib';
import { build } from '../package.json';

exports.default = async function notarizeMacos(context: any) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') {
    return;
  }

  if (process.env.CI !== 'true') {
    console.warn('Skipping notarizing step. Packaging is not running in CI');
    return;
  }

  if (
    !(
      'APPLE_ID' in process.env &&
      'APPLE_ID_PASS' in process.env &&
      'APPLE_TEAM_ID' in process.env
    )
  ) {
    console.warn(
      'Skipping notarizing step. APPLE_ID, APPLE_ID_PASS, and APPLE_TEAM_ID env variables must be set',
    );
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  await notarize({
    tool: 'notarytool',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID!,
    appleIdPassword: process.env.APPLE_ID_PASS!,
    teamId: process.env.APPLE_TEAM_ID!,
  });
};
/* '
No overload matches this call.
  Overload 1 of 2, '(args: NotarizeOptionsNotaryTool): Promise<void>', gave the following error.
    Object literal may only specify known properties, and 'appBundleId' does not exist in type 'NotarizeOptionsNotaryTool'.
  Overload 2 of 2, '(args: NotarizeOptionsLegacy): Promise<void>', gave the following error.
    Type '"notarytool"' is not assignable to type '"legacy"'.ts(2769)
types.d.ts(150, 5): The expected type comes from property 'tool' which is declared here on type 'NotarizeOptionsLegacy'
(alias) notarize(args: NotarizeOptionsNotaryTool): Promise<void> (+1 overload)
import notarize
Sends your app to Apple for notarization with notarytool and staples a successful notarization result to the app bundle. This includes your NotaryToolNotarizeAppOptions.appPath appPath as well as one of three valid credential authentication strategies.
*/
