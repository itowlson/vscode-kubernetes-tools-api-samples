export interface LogEntry {
    readonly podName: string;
    readonly containerName: string;
    readonly timestamp: string;
    readonly message: string;
}
