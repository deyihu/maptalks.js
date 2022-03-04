
/**
 * create a proxy
 * @param {*} target
 * @param {*} handler
 * @returns Proxy
 */

export function createProxy(target, handler) {
    return new Proxy(target, {
        set: (obj, key, value) => {
            obj[key] = value;
            handler({ [key]: value });
            return true;
        }
    });
}
