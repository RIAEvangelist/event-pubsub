const packageSpecifier = typeof process === 'object' && process?.release?.name === 'node'
    ? '../index.js'
    : 'event-pubsub';
const namespace = await import(packageSpecifier);

export const EventPubSub = namespace.EventPubSub;
export default namespace.default;
