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

  const scriptPath = path.resolve(__dirname, `${scriptName}.ts`);
  const moduleExists = fs.existsSync(scriptPath);
  if (!moduleExists) {
    throw new Error(`Script '${scriptName}' not found`);
  }

  try {

    const { main } = await import(`./${scriptName}`);
    const response = await main(...scriptArgs);
    return response
  } catch (err) {
    console.log(err);
  }
}