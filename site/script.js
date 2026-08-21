const copyButtons = document.querySelectorAll('[data-copy]');

for (const button of copyButtons) {
    button.addEventListener('click', async () => {
        const target = document.querySelector(button.dataset.copy);
        if (!target) return;

        try {
            await navigator.clipboard.writeText(target.textContent.trim());
            const original = button.textContent;
            button.textContent = 'Copied';
            setTimeout(() => { button.textContent = original; }, 1400);
        } catch {
            button.textContent = 'Select text';
            const selection = globalThis.getSelection();
            const range = document.createRange();
            range.selectNodeContents(target);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    });
}

const statusTargets = document.querySelectorAll('[data-status-field]');

if (statusTargets.length > 0) {
    fetch('./data/status.json')
        .then((response) => {
            if (!response.ok) throw new Error(`Status request failed: ${response.status}`);
            return response.json();
        })
        .then((status) => {
            for (const target of statusTargets) {
                const path = target.dataset.statusField.split('.');
                let value = status;
                for (const key of path) value = value?.[key];
                if (value === undefined || value === null) continue;
                target.textContent = target.dataset.suffix ? `${value}${target.dataset.suffix}` : String(value);
                if (target.closest('.metric') && typeof value === 'number') {
                    target.closest('.metric').dataset.state = value >= 100 ? 'pass' : 'measured';
                }
            }
        })
        .catch((error) => {
            console.warn('Published status data is unavailable.', error);
        });
}
