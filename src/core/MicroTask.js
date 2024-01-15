import PromisePolyfill from './Promise';
import { requestAnimFrame } from './util';
import { isFunction, isNil, isNumber, now } from './util/common';
import { getGlobalWorkerPool } from './worker/WorkerPool';
import Browser from './Browser';
import GlobalConfig from '../GlobalConfig';

let tasks = [];

/**
 *
 * @param {Object|Function} task  - a micro task(Promise)
 * @param {Number} task.count - task run count
 * @param {Function} task.run - task run function
 * @return {Promise}
 * @example
 * const run =()=>{
 * //do some things
 * };
 * runTaskAsync({count:4,run}).then(result=>{})
 * runTaskAsync(run).then(result=>{})
 */
export function runTaskAsync(task) {
    startTasks();
    const promise = new PromisePolyfill((resolve, reject) => {
        if (!task) {
            reject(new Error('task is null'));
            return;
        }
        if (isFunction(task)) {
            task = { count: 1, run: task };
        }
        if (!task.run) {
            reject(new Error('task.run is null'));
            return;
        }
        if (isNil(task.count)) {
            task.count = 1;
        }
        task.count = Math.ceil(task.count);
        if (!isNumber(task.count)) {
            reject(new Error('task.count is not number'));
            return;
        }
        task.results = [];
        tasks.push(task);
        task.resolve = resolve;
    });
    return promise;
}

function executeMicroTasks() {
    if (tasks.length === 0) {
        return;
    }
    const runingTasks = [], endTasks = [];
    let len = tasks.length;
    for (let i = 0; i < len; i++) {
        const task = tasks[i];
        task.count--;
        if (task.count === -1) {
            endTasks.push(task);
        } else {
            runingTasks.push(task);
            const result = task.run();
            task.results.push(result);
        }
    }
    tasks = runingTasks;
    len = endTasks.length;
    for (let i = 0; i < len; i++) {
        const task = endTasks[i];
        if (task.resolve) {
            task.resolve(task.results);
        }
    }
}

let broadcastIdleMessage = true;
function loop() {
    if (broadcastIdleMessage) {
        getGlobalWorkerPool().broadcastIdleMessage();
    } else {
        getGlobalWorkerPool().commit();
    }
    executeMicroTasks();
    broadcastIdleMessage = !broadcastIdleMessage;
}

let loopFrameTime = now();
function frameLoop(deadline) {
    const { idleTimeRemaining, idleLog, idleTimeout, idleForceTimeThreshold } = GlobalConfig;
    if (Browser.requestIdleCallback) {
        if (deadline && deadline.timeRemaining) {
            const t = deadline.timeRemaining();
            if (t > idleTimeRemaining || deadline.didTimeout) {
                if (deadline.didTimeout && idleLog) {
                    console.error('idle timeout in', idleTimeout);
                }
                loop();
                loopFrameTime = now();
            } else {
                const time = now();
                if (time - loopFrameTime > idleForceTimeThreshold) {
                    loop();
                    loopFrameTime = now();
                }
                if (t <= idleTimeRemaining && idleLog) {
                    console.warn('currrent page is busy,the timeRemaining is', t);
                }
            }
        }
        requestIdleCallback(frameLoop, { timeout: idleTimeout });
    } else {
        loop();
        // Fallback to requestAnimFrame
        requestAnimFrame(frameLoop);
        if (idleLog) {
            console.warn('current env not support requestIdleCallback. Fallback to requestAnimFrame');
        }
    }
}

let started = false;
export function startTasks() {
    if (started) {
        return;
    }
    started = true;
    const { idleTimeout } = GlobalConfig;
    if (Browser.requestIdleCallback) {
        requestIdleCallback(frameLoop, { timeout: idleTimeout });
    } else {
        requestAnimFrame(frameLoop);
    }
}
