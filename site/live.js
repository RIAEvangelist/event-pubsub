import run from './module/test/CI.js';

const title = document.querySelector('#live-title');
const score = document.querySelector('#live-score');
const categories = document.querySelector('#live-categories');

try {
    const result = await run();
    title.textContent = result.ok ? 'All browser checks passed' : 'Browser checks failed';
    score.textContent = `${result.total - result.failureCount}/${result.total}`;
    score.dataset.ok = String(result.ok);
    categories.replaceChildren();

    for (const category of result.categories) {
        const card = document.createElement('article');
        card.className = 'card';
        const heading = document.createElement('h2');
        heading.textContent = category.name;
        const copy = document.createElement('p');
        copy.textContent = `${category.passedCount}/${category.total} passed · ${category.description}`;
        card.append(heading, copy);
        categories.append(card);
    }
} catch (error) {
    title.textContent = 'Browser harness error';
    score.textContent = '×';
    console.error(error);
}
