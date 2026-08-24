export const normalConsumerImportMap = Object.freeze({
    imports: Object.freeze({
        'event-pubsub': './node_modules/event-pubsub/index.js',
        'strong-type': './node_modules/strong-type/index.js'
    })
});

export const conflictConsumerImportMap = Object.freeze({
    imports: Object.freeze({
        'event-pubsub': './node_modules/event-pubsub/index.js',
        'strong-type': './node_modules/strong-type/index.js'
    }),
    scopes: Object.freeze({
        './node_modules/event-pubsub/': Object.freeze({
            'strong-type': './node_modules/event-pubsub/node_modules/strong-type/index.js'
        })
    })
});

export function importMapScript(importMap) {
    return `<script type="importmap">\n${JSON.stringify(importMap, null, 2)}\n</script>`;
}
