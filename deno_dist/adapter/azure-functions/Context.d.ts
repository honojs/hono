import { Buffer } from "node:buffer";
// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import type { HttpRequest } from './http/index.ts'

/**
 * The context object can be used for writing logs, reading data from bindings, setting outputs and using
 * the context.done callback when your exported function is synchronous. A context object is passed
 * to your function from the Azure Functions runtime on function invocation.
 */
export interface Context {
    /**
     * A unique GUID per function invocation.
     */
    invocationId: string;
    /**
     * Function execution metadata.
     */
    executionContext: ExecutionContext;
    /**
     * Input and trigger binding data, as defined in function.json. Properties on this object are dynamically
     * generated and named based off of the "name" property in function.json.
     */
    bindings: ContextBindings;
    /**
     * Trigger metadata and function invocation data.
     */
    bindingData: ContextBindingData;
    /**
     * TraceContext information to enable distributed tracing scenarios.
     */
    traceContext: TraceContext;
    /**
     * Bindings your function uses, as defined in function.json.
     */
    bindingDefinitions: BindingDefinition[];
    /**
     * Allows you to write streaming function logs. Calling directly allows you to write streaming function logs
     * at the default trace level.
     */
    log: Logger;
    /**
     * A callback function that signals to the runtime that your code has completed. If your function is synchronous,
     * you must call context.done at the end of execution. If your function is asynchronous, you should not use this
     * callback.
     *
     * @param err A user-defined error to pass back to the runtime. If present, your function execution will fail.
     * @param result An object containing output binding data. `result` will be passed to JSON.stringify unless it is
     *  a string, Buffer, ArrayBufferView, or number.
     *
     * @deprecated Use of sync functions with `context.done()` is not recommended. Use async/await and pass the response as the return value instead.
     * See the docs here for more information: https://aka.ms/functions-js-async-await
     */
    done(err?: Error | string | null, result?: any): void;
    /**
     * HTTP request object. Provided to your function when using HTTP Bindings.
     */
    req?: HttpRequest;
    /**
     * HTTP response object. Provided to your function when using HTTP Bindings.
     */
    res?: {
        [key: string]: any;
    };
    /**
     * If this flag is set to true in your function, the error for calling `context.done()` within
     * an async function will not be logged. More info: https://go.microsoft.com/fwlink/?linkid=2097909
     * @default false
     */
    suppressAsyncDoneError?: boolean;
}

/**
 * Context bindings object. Provided to your function binding data, as defined in function.json.
 */
export interface ContextBindings {
    [name: string]: any;
}

/**
 * Context binding data. Provided to your function trigger metadata and function invocation data.
 */
export interface ContextBindingData {
    /**
     * A unique GUID per function invocation.
     */
    invocationId: string;

    [name: string]: any;
}

export interface ExecutionContext {
    /**
     * A unique GUID per function invocation.
     */
    invocationId: string;
    /**
     * The name of the function that is being invoked. The name of your function is always the same as the
     * name of the corresponding function.json's parent directory.
     */
    functionName: string;
    /**
     * The directory your function is in (this is the parent directory of this function's function.json).
     */
    functionDirectory: string;
    /**
     * The retry context of the current function execution or null if the retry policy is not defined.
     */
    retryContext: RetryContext | null;
}

export interface RetryContext {
    /**
     * Current retry count of the function executions.
     */
    retryCount: number;
    /**
     * Max retry count is the maximum number of times an execution is retried before eventual failure. A value of -1 means to retry indefinitely.
     */
    maxRetryCount: number;
    /**
     * Exception that caused the retry
     */
    exception?: Exception;
}

export interface Exception {
    /** Exception source */
    source?: string | null;
    /** Exception stackTrace */
    stackTrace?: string | null;
    /** Exception message */
    message?: string | null;
}

/**
 * TraceContext information to enable distributed tracing scenarios.
 */
export interface TraceContext {
    /** Describes the position of the incoming request in its trace graph in a portable, fixed-length format. */
    traceparent: string | null | undefined;
    /** Extends traceparent with vendor-specific data. */
    tracestate: string | null | undefined;
    /** Holds additional properties being sent as part of request telemetry. */
    attributes:
        | {
              [k: string]: string;
          }
        | null
        | undefined;
}

export interface BindingDefinition {
    /**
     * The name of your binding, as defined in function.json.
     */
    name: string;
    /**
     * The type of your binding, as defined in function.json.
     */
    type: string;
    /**
     * The direction of your binding, as defined in function.json.
     */
    direction: 'in' | 'out' | 'inout' | undefined;
}

/**
 * Allows you to write streaming function logs.
 */
export interface Logger {
    /**
     * Writes streaming function logs at the default trace level.
     */
    (...args: any[]): void;
    /**
     * Writes to error level logging or lower.
     */
    error(...args: any[]): void;
    /**
     * Writes to warning level logging or lower.
     */
    warn(...args: any[]): void;
    /**
     * Writes to info level logging or lower.
     */
    info(...args: any[]): void;
    /**
     * Writes to verbose level logging.
     */
    verbose(...args: any[]): void;
}
