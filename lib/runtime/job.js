import { ExecutionContext, getRunningExecutionContext, pushExecutionContext, popExecutionContext } from './execution_context.js';

const jobQueue = {};
jobQueue['ScriptJobs'] = [];

class PendingJob {
    constructor(job, args, realm) {
        this.job = job;
        this.args = args;
        this.realm = realm;
    }
}

export function enqueueJob(queueName, job, args) {
    const callerContext = getRunningExecutionContext();
    const callerRealm = callerContext.realm;
    const pending = new PendingJob(job, args, callerRealm);
    jobQueue[queueName].push(pending);
};

export function nextJob(result) {
    popExecutionContext();

    let nextQueue;
    for (const queueName of ['ScriptJobs']) {
        if (jobQueue[queueName].length > 0) {
            nextQueue = jobQueue[queueName];
            break;
        }
    }
    if (!nextQueue) {
        return;
    }
    const nextPending = nextQueue.shift();
    const newContext = new ExecutionContext();
    newContext.realm = nextPending.realm;
    pushExecutionContext(newContext);
    nextPending.job(...nextPending.args);
};
