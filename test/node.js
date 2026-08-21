import run from './CI.js';

const [category] = process.argv.slice(2);
const result = await run(category ? {category} : undefined);
process.exitCode = result.ok ? 0 : 1;
