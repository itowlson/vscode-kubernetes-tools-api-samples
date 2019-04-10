export interface Accepted<T> {
    readonly cancelled: false;
    readonly value: T;
}

export interface Cancelled {
    readonly cancelled: true;
}

export type Cancellable<T> = Accepted<T> | Cancelled;

export const CANCELLED: Cancelled = { cancelled: true };
