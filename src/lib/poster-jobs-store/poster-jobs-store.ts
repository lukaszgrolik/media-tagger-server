// export class PosterJob {
//     readonly createdAt: string;
//     readonly filePaths: string[];

//     progress: { count: number; progress: number; date: string } = { count: 0, progress: 0, date: '' };

//     readonly failed: {
//         path: string;
//         error: Error;
//     }[] = [];

//     readonly succeeded: {
//         src: string;
//         dest: string;
//     }[] = [];

//     constructor(readonly id: number, body: { createdAt: string; filePaths: string[] }) {
//         this.createdAt = body.createdAt;
//         this.filePaths = body.filePaths;
//     }
// }

// export class PosterJobsStore {
//     private jobsIdCounter = 0;
//     readonly jobs: PosterJob[] = [];

//     createJob(body: { filePaths: string[] }) {
//         const job = new PosterJob(++this.jobsIdCounter, {
//             createdAt: new Date().toISOString(),
//             filePaths: body.filePaths,
//         });

//         this.jobs.push(job);

//         return job;
//     }

//     removeFinishedJobs() {
//         const finishedJobs = this.jobs.filter(j => j.progress.progress === 1);

//         finishedJobs.forEach(job => {
//             const index = this.jobs.indexOf(job);
//             if (index !== -1) {
//                 this.jobs.splice(index, 1);
//             }
//         });
//     }
// }