import assert from 'node:assert/strict';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {validateBenchmark} from '../site/benchmark-data.js';

const projectRoot = resolve(import.meta.dirname, '..');
const resultsPath = resolve(projectRoot, 'benchmark', 'results.json');
const outputPath = resolve(projectRoot, 'site', 'benchmark-summary.svg');
const manifest = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf8'));
const benchmark = validateBenchmark(
    JSON.parse(readFileSync(resultsPath, 'utf8')),
    {name: manifest.name, version: manifest.version}
);
const scenarios = benchmark.scenarios.filter(({group}) => group === 'dispatch');
assert.equal(scenarios.length, 4, 'The README chart requires four dispatch scenarios.');

function escapeXml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

function fixed(value, digits = 1) {
    return Number(value.toFixed(digits));
}

function svg() {
    const width = 1200;
    const height = 520;
    const plotLeft = 390;
    const plotRight = 1110;
    const plotWidth = plotRight - plotLeft;
    const rowTop = 144;
    const rowGap = 72;
    const maximum = Math.max(
        ...scenarios.flatMap(({samples}) => samples.map(({nanosecondsPerOperation}) => nanosecondsPerOperation)),
        ...scenarios.map(({summary}) => summary.maxNanosecondsPerOperation)
    ) * 1.08;
    const x = (value) => plotLeft + (value / maximum) * plotWidth;
    const ticks = [0, 0.25, 0.5, 0.75, 1];
    const rows = scenarios.map((scenario, index) => {
        const y = rowTop + index * rowGap;
        const {summary} = scenario;
        const medianX = x(summary.medianNanosecondsPerOperation);
        const p25X = x(summary.p25NanosecondsPerOperation);
        const p75X = x(summary.p75NanosecondsPerOperation);
        const throughput = summary.medianOperationsPerSecond / 1_000_000;
        const dots = scenario.samples.map(({nanosecondsPerOperation}) =>
            `<circle class="sample" cx="${fixed(x(nanosecondsPerOperation), 2)}" cy="${y + 29}" r="4"/>`
        ).join('');
        return [
            `<text class="label" x="52" y="${y + 8}">${escapeXml(scenario.name)}</text>`,
            `<text class="work" x="52" y="${y + 31}">${escapeXml(scenario.workload.timed)}</text>`,
            `<rect class="track" x="${plotLeft}" y="${y - 5}" width="${plotWidth}" height="20" rx="10"/>`,
            `<rect class="bar" x="${plotLeft}" y="${y - 5}" width="${fixed(medianX - plotLeft, 2)}" height="20" rx="10"/>`,
            `<line class="interval" x1="${fixed(p25X, 2)}" x2="${fixed(p75X, 2)}" y1="${y + 5}" y2="${y + 5}"/>`,
            `<line class="whisker" x1="${fixed(p25X, 2)}" x2="${fixed(p25X, 2)}" y1="${y - 2}" y2="${y + 12}"/>`,
            `<line class="whisker" x1="${fixed(p75X, 2)}" x2="${fixed(p75X, 2)}" y1="${y - 2}" y2="${y + 12}"/>`,
            dots,
            `<text class="value" x="${plotRight}" y="${y - 13}" text-anchor="end">${fixed(summary.medianNanosecondsPerOperation, 2)} ns/emit · ${fixed(throughput, 2)}M emits/s</text>`
        ].join('\n');
    }).join('\n');
    const grid = ticks.map((fraction) => {
        const tickX = plotLeft + plotWidth * fraction;
        return [
            `<line class="grid" x1="${fixed(tickX, 2)}" x2="${fixed(tickX, 2)}" y1="116" y2="410"/>`,
            `<text class="tick" x="${fixed(tickX, 2)}" y="432" text-anchor="middle">${fixed(maximum * fraction, 1)} ns</text>`
        ].join('\n');
    }).join('\n');
    const commit = benchmark.package.commit.slice(0, 12);
    const provenance = `${benchmark.package.name}@${benchmark.package.version} · ${benchmark.environment.node} · ${benchmark.environment.cpuModel} · ${commit}`;
    const description = scenarios.map(({name, summary}) =>
        `${name}: ${fixed(summary.medianNanosecondsPerOperation, 2)} nanoseconds per emit, ${fixed(summary.medianOperationsPerSecond / 1_000_000, 2)} million emits per second.`
    ).join(' ');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="520" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description">
<title id="title">event-pubsub dispatch execution latency</title>
<desc id="description">${escapeXml(description)} Lower latency is better. Setup, warmup, validation, verification, reporting, and file input/output are excluded.</desc>
<style>
    .background { fill: #050914; }
    .title, .label, .value { fill: #f8fbff; font-family: ui-sans-serif, system-ui, sans-serif; }
    .title { font-size: 30px; font-weight: 700; }
    .subtitle, .work, .tick, .provenance { fill: #aab8cc; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
    .subtitle { font-size: 17px; }
    .label { font-size: 18px; font-weight: 650; }
    .work { font-size: 13px; }
    .value { font-size: 15px; font-weight: 650; }
    .tick, .provenance { font-size: 13px; }
    .grid { stroke: #27344b; stroke-width: 1; }
    .track { fill: #152038; }
    .bar { fill: #22d3ee; }
    .interval, .whisker { stroke: #fbbf24; stroke-width: 4; }
    .whisker { stroke-width: 2; }
    .sample { fill: #f8fbff; stroke: #050914; stroke-width: 2; }
</style>
<rect class="background" width="1200" height="520" rx="18"/>
<text class="title" x="52" y="53">Dispatch latency — actual execution only</text>
<text class="subtitle" x="52" y="82">Median bar · p25–p75 whisker · seven raw samples · lower is better</text>
${grid}
${rows}
<text class="provenance" x="52" y="473">${escapeXml(provenance)}</text>
<text class="provenance" x="52" y="496">Only execute(operations) is timed. Setup, calibration, warmup, verification, serialization, file I/O, and CI orchestration are excluded.</text>
</svg>
`;
}

const expected = svg();
if (process.argv.includes('--check')) {
    assert.ok(existsSync(outputPath), 'Missing generated benchmark chart.');
    assert.equal(readFileSync(outputPath, 'utf8'), expected, 'Benchmark chart is stale. Run npm run benchmark:chart.');
    process.stdout.write('Benchmark chart matches validated execution evidence.\n');
} else {
    writeFileSync(outputPath, expected);
    process.stdout.write('Generated site/benchmark-summary.svg from validated execution evidence.\n');
}
