import { EventEmitter } from "events";
import { SystemPath } from "./system-path";

class List<T> extends Array<T> {
    remove(el: T) {
        const index = this.indexOf(el);

        if (index !== -1) {
            this.splice(index, 1);
        }
    }

    // fastRemove(el: T) {
    //     if (this.length <= 2) this.remove(el);

    //     const index = this.indexOf(el);

    //     if (index !== -1) {
    //         const lastEl = this[this.length - 1];

    //         this.length -= 1;
    //         this.splice(index, 1, lastEl);
    //     }
    // }
}

export class JobService {
    private jobsIdCounter = 0;
    readonly jobs: Job[] = [];
    readonly jobs_inQueue = new List<Job>();
    readonly jobs_inProgress = new List<Job>();

    enqueueJob(job: Job) {
        job.setId(++this.jobsIdCounter);

        this.jobs.push(job);

        job.events.on('finished', () => {
            this.jobs_inProgress.remove(job);

            if (this.jobs_inQueue.length) {
                const nextJob = this.jobs_inQueue[0];
                this.startJob(nextJob);
            }
        });

        if (this.jobs_inProgress.length) {
            job.status = 'in-queue';

            this.jobs_inQueue.push(job);
        }
        else {
            this.startJob(job);
        }

        return job;
    }

    private startJob(job: Job) {
        this.jobs_inQueue.remove(job);
        this.jobs_inProgress.push(job);

        job.status = 'in-progress';

        job.action();
    }
}

export type JobAction = () => Promise<void>;
export type JobStatus = 'unstarted' | 'in-queue' | 'in-progress' | 'finished';
export abstract class Job {
    readonly events = new EventEmitter();

    private _id: number = -1;
    get id() { return this._id; }

    private _name: string = '';
    get name() { return this._name; }
    protected set name(val: string) { this._name = val; }

    readonly createdAt: string;
    finishedAt: string = '';
    readonly action: JobAction;
    // readonly filePaths: string[];

    status: JobStatus = 'unstarted';

    // constructor(readonly id: number, body: { filePaths: string[] }) {
    constructor(action: JobAction) {
        this.createdAt = new Date().toISOString();
        this.action = action;
        // this.filePaths = body.filePaths;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            createdAt: this.createdAt,
            status: this.status,
        }
    }

    setId(id: number) {
        this._id = id;
    }

    protected markFinished() {
        this.finishedAt = new Date().toISOString();
        this.status = 'finished';

        this.events.emit('finished');
    }
}

type FileJobFailedTask<T> = {
    path: T;
    error: Error;
};
abstract class ProcessFileJob<T, TS> extends Job {
    readonly filePaths: T[] = [];

    readonly succeeded: TS[] = [];
    readonly failed: FileJobFailedTask<T>[] = [];
    // progress: { count: number; progress: number; date: string } = { count: 0, progress: 0, date: '' };
    get processedCount() { return this.succeeded.length + this.failed.length; }
    progress = 0;

    constructor(action: JobAction, filePaths: T[]) {
        super(action);

        this.filePaths = filePaths;
    }

    override toJSON() {
        return {
            ...super.toJSON(),
            filePaths: this.filePaths.length,
            succeeded: this.succeeded.length,
            failed: this.failed,
            progress: this.progress,
        };
    }

    markFileSucceeded(file: TS) {
        this.succeeded.push(file);

        this.updateProgress();
    }

    markFileFailed(file: FileJobFailedTask<T>) {
        this.failed.push(file);

        this.updateProgress();
    }

    private updateProgress() {
        this.progress = this.processedCount / this.filePaths.length;

        if (this.processedCount === this.filePaths.length) {
            this.markFinished();
        }
    }
}

export class GenerateVideoPostersJob extends ProcessFileJob<string, {src: string; dest: string}> {
    constructor(body: { action: JobAction, filePaths: string[] }) {
        super(body.action, body.filePaths);

        this.name = 'generate-video-posters';
    }
}

export class GenerateImageThumbnailsJob extends ProcessFileJob<string, { src: SystemPath; sizes: { size: number; path: SystemPath }[]}> {
    constructor(body: { action: JobAction, filePaths: string[] }) {
        super(body.action, body.filePaths);

        this.name = 'generate-image-thumbnails';
    }
}

export class LoadFileMetaJob extends ProcessFileJob<string, {path: string }> {

}