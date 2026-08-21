export function assert(condition, message = 'Expected condition to be truthy.') {
    if (!condition) throw new Error(message);
}

export function equal(actual, expected, message = 'Values are not identical.') {
    if (!Object.is(actual, expected)) {
        throw new Error(`${message} Expected ${String(expected)}, received ${String(actual)}.`);
    }
}

export function arrayEqual(actual, expected, message = 'Arrays differ.') {
    assert(Array.isArray(actual), `${message} Actual value is not an array.`);
    equal(actual.length, expected.length, `${message} Length mismatch.`);

    for (let index = 0; index < expected.length; index += 1) {
        equal(actual[index], expected[index], `${message} Difference at index ${index}.`);
    }
}

export function throws(callback, ErrorType = Error, messageIncludes) {
    try {
        callback();
    } catch (error) {
        assert(error instanceof ErrorType, `Expected ${ErrorType.name}, received ${error?.constructor?.name ?? typeof error}.`);
        if (messageIncludes) {
            assert(String(error.message).includes(messageIncludes), `Expected error message to include ${messageIncludes}.`);
        }
        return error;
    }

    throw new Error(`Expected ${ErrorType.name} to be thrown.`);
}
