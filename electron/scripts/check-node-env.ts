import chalk from 'chalk';
import { Environment } from 'source-map-support';

export default function checkNodeEnv(expectedEnv?: any) {
  if (!expectedEnv) {
    throw new Error('"expectedEnv" not set');
  }

  if (process.env.NODE_ENV !== expectedEnv) {
    console.log(
      chalk.whiteBright.bgRed.bold(
        `"process.env.NODE_ENV" must be "${expectedEnv}" to use this config`,
      ),
    );
    process.exit(2);
  }
}
