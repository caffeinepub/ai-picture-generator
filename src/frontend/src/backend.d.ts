import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Generation {
    id: string;
    style: string;
    imageUrl: string;
    timestamp: bigint;
    prompt: string;
}
export interface backendInterface {
    deleteGeneration(id: string): Promise<void>;
    getGenerations(): Promise<Array<Generation>>;
    saveGeneration(prompt: string, style: string, imageUrl: string): Promise<Generation>;
}
