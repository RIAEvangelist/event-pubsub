import {
    chartPercent,
    durationScale,
    formatDuration,
    formatLatency,
    formatThroughput,
    scenariosFor,
    validateBenchmark
} from './benchmark-data.js';

function element(name, className, text) {
    const node = document.createElement(name);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function renderChart(container, data) {
    const group = container.dataset.benchmarkGroup;
    const scenarios = scenariosFor(data, group);
    const sampleMaximum = Math.max(
        ...scenarios.flatMap((scenario) => scenario.samples.map((sample) => sample.nanosecondsPerOperation)),
        ...scenarios.map((scenario) => scenario.summary.maxNanosecondsPerOperation)
    );
    const maximum = sampleMaximum * 1.08;
    const scale = durationScale(maximum);
    const rows = element('ol', 'latency-chart');
    rows.setAttribute('aria-label', `${container.dataset.chartTitle}; lower is better`);

    for (const scenario of scenarios) {
        const summary = scenario.summary;
        const row = element('li', 'latency-row');
        row.setAttribute(
            'aria-label',
            `${scenario.name}: median ${formatLatency(summary.medianNanosecondsPerOperation, scenario.unit, scale)}, ` +
            `p25 ${formatLatency(summary.p25NanosecondsPerOperation, scenario.unit, scale)}, ` +
            `p75 ${formatLatency(summary.p75NanosecondsPerOperation, scenario.unit, scale)}. Lower is better.`
        );

        const label = element('div', 'latency-label');
        label.append(
            element('strong', '', scenario.name),
            element('code', '', scenario.workload.timed)
        );

        const track = element('div', 'latency-track');
        track.setAttribute('aria-hidden', 'true');
        const bar = element('span', 'latency-bar');
        bar.style.width = `${chartPercent(summary.medianNanosecondsPerOperation, maximum)}%`;
        const interval = element('span', 'latency-interval');
        interval.style.left = `${chartPercent(summary.p25NanosecondsPerOperation, maximum)}%`;
        interval.style.width = `${chartPercent(
            summary.p75NanosecondsPerOperation - summary.p25NanosecondsPerOperation,
            maximum
        )}%`;
        track.append(bar, interval);
        for (const sample of scenario.samples) {
            const dot = element('span', 'latency-sample');
            dot.style.left = `${chartPercent(sample.nanosecondsPerOperation, maximum)}%`;
            track.append(dot);
        }

        const value = element('div', 'latency-value');
        value.append(
            element('strong', '', formatLatency(summary.medianNanosecondsPerOperation, scenario.unit, scale)),
            element('span', '', formatThroughput(summary.medianNanosecondsPerOperation, scenario.unit))
        );
        row.append(label, track, value);
        rows.append(row);
    }

    const scaleLine = element('div', 'latency-scale');
    scaleLine.setAttribute('aria-hidden', 'true');
    scaleLine.append(
        element('span', '', `0 ${scale.unit}`),
        element('span', '', formatDuration(maximum / 2, scale)),
        element('span', '', formatDuration(maximum, scale))
    );

    const tableWrap = element('div', 'table-wrap');
    const table = element('table', 'reference-table benchmark-table');
    const caption = element('caption', '', `${container.dataset.chartTitle} exact values`);
    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const heading of ['Scenario', 'Only timed code', 'Median', 'Middle 50%', 'Equivalent rate']) {
        const cell = element('th', '', heading);
        cell.scope = 'col';
        headRow.append(cell);
    }
    head.append(headRow);
    const body = document.createElement('tbody');
    for (const scenario of scenarios) {
        const summary = scenario.summary;
        const row = document.createElement('tr');
        const name = element('th', '', scenario.name);
        name.scope = 'row';
        const timed = document.createElement('td');
        timed.append(element('code', '', scenario.workload.timed));
        for (const value of [
            formatLatency(summary.medianNanosecondsPerOperation, scenario.unit, scale),
            `${formatLatency(summary.p25NanosecondsPerOperation, scenario.unit, scale)}–${formatLatency(summary.p75NanosecondsPerOperation, scenario.unit, scale)}`,
            formatThroughput(summary.medianNanosecondsPerOperation, scenario.unit)
        ]) row.append(element('td', '', value));
        row.prepend(name, timed);
        body.append(row);
    }
    table.append(caption, head, body);
    tableWrap.append(table);
    container.replaceChildren(scaleLine, rows, tableWrap);
}

function valueAtPath(value, path) {
    for (const key of path.split('.')) value = value?.[key];
    return value;
}

function renderMetadata(data) {
    for (const target of document.querySelectorAll('[data-benchmark-meta]')) {
        const value = valueAtPath(data, target.dataset.benchmarkMeta);
        if (value === undefined || value === null) continue;
        target.textContent = Array.isArray(value) ? value.join(', ') : String(value);
    }
}

const chartTargets = document.querySelectorAll('[data-benchmark-group]');
const metadataTargets = document.querySelectorAll('[data-benchmark-meta]');

if (chartTargets.length > 0 || metadataTargets.length > 0) {
    fetch('./data/benchmark.json')
        .then((response) => {
            if (!response.ok) throw new Error(`Benchmark request failed: ${response.status}`);
            return response.json();
        })
        .then((data) => {
            validateBenchmark(data);
            for (const target of chartTargets) renderChart(target, data);
            renderMetadata(data);
            for (const status of document.querySelectorAll('[data-benchmark-status]')) {
                status.textContent = 'Current CI benchmark loaded.';
            }
        })
        .catch((error) => {
            for (const status of document.querySelectorAll('[data-benchmark-status]')) {
                status.textContent = 'Benchmark evidence could not be loaded. Open the JSON artifact for details.';
                status.dataset.state = 'error';
            }
            console.error(error);
        });
}
