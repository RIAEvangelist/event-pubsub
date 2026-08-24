import VanillaTest from 'vanilla-test';
import unit from './unit.js';
import functional from './functional.js';
import integration from './integration.js';
import behavioral from './behavioral.js';
import regression from './regression.js';
import interfaceSuite from './interface.js';

const categories = Object.freeze([unit, functional, integration, behavioral, regression, interfaceSuite]);

function selectCategories(category) {
    if (category === undefined) return categories;
    if (typeof category !== 'string') throw new TypeError('category must be a string.');

    const selected = categories.filter(
        (candidate) => candidate.name.toLowerCase() === category.toLowerCase()
    );

    if (selected.length === 0) throw new RangeError(`Unknown test category: ${category}`);
    return selected;
}

export async function run({category} = {}) {
    const selectedCategories = selectCategories(category);
    const suite = new VanillaTest();
    const descriptions = new Set();
    const categoryResults = [];

    for (const testCategory of selectedCategories) {
        let passedCount = 0;
        const failed = [];

        for (const testCase of testCategory.tests) {
            const description = `${testCategory.name} · ${testCase.name}`;
            if (descriptions.has(description)) throw new Error(`Duplicate test description: ${description}`);
            descriptions.add(description);
            suite.expects(description);

            try {
                await testCase.run();
                passedCount += 1;
                suite.pass();
            } catch (error) {
                failed.push(`${testCase.name} — ${error instanceof Error ? error.message : String(error)}`);
                console.error(error?.stack ?? error);
                suite.fail();
            }

            suite.done();
        }

        categoryResults.push(Object.freeze({
            name: testCategory.name,
            description: testCategory.description,
            total: testCategory.tests.length,
            passedCount,
            failureCount: failed.length,
            failed: Object.freeze(failed)
        }));
    }

    const report = suite.report();
    return Object.freeze({...report, categories: Object.freeze(categoryResults)});
}

export {categories};
export default run;
