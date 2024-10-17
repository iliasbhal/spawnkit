import fs from 'fs'
import path from 'path';

executScript();

async function executScript() {
  const args = process.argv.slice(2);

  const scriptName = args[0];
  const scriptArgs = args.slice(1);
  if (!scriptName) {
    throw new Error('Script name is required');
  }

  console.log(fs.readdirSync(__dirname));
  const scriptPath = path.resolve(__dirname, `${scriptName}.ts`);
  const moduleExists = fs.existsSync(scriptPath);
  if (!moduleExists) {
    throw new Error(`Script '${scriptName}' not found`);
  }

  const { main } = await import(`./${scriptName}`);
  return await main(...scriptArgs);
}