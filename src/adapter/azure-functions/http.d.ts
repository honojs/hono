// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

/**
 * HTTP request headers.
 */
export interface HttpRequestHeaders {
    [name: string]: string;
}

/**
 * HTTP response headers.
 */
export interface HttpResponseHeaders {
    [name: string]: string;
}

/**
 * Query string parameter keys and values from the URL.
 */
export interface HttpRequestQuery {
    [name: string]: string;
}

/**
 * Route parameter keys and values.
 */
export interface HttpRequestParams {
    [name: string]: string;
}

/**
 *  Object representing logged-in user, either through
 *  AppService/Functions authentication, or SWA Authentication
 */
export interface HttpRequestUser {
    /**
     * Type of authentication, either AppService or StaticWebApps
     */
    type: HttpRequestUserType;
    /**
     * unique user GUID
     */
    id: string;
    /**
     * unique username
     */
    username: string;
    /**
     * provider of authentication service
     */
    identityProvider: string;
    /**
     * Extra authentication information, dependent on auth type
     * and auth provider
     */
    claimsPrincipalData: {
        [key: string]: any;
    };
}

/**
 * HTTP request object. Provided to your function when using HTTP Bindings.
 */
export interface HttpRequest {
    /**
     * HTTP request method used to invoke this function.
     */
    method: HttpMethod | null;
    /**
     * Request URL.
     */
    url: string;
    /**
     * HTTP request headers.
     */
    headers: HttpRequestHeaders;
    /**
     * Query string parameter keys and values from the URL.
     */
    query: HttpRequestQuery;
    /**
     * Route parameter keys and values.
     */
    params: HttpRequestParams;
    /**
     *  Object representing logged-in user, either through
     *  AppService/Functions authentication, or SWA Authentication
     *  null when no such user is logged in.
     */
    user: HttpRequestUser | null;
    /**
     * The HTTP request body.
     * If the media type is 'application/octet-stream' or 'multipart/*', this will be a Buffer
     * If the value is a JSON parse-able string, this will be the parsed object
     * Otherwise, this will be a string
     */
    body?: any;

    /**
     * The HTTP request body as a UTF-8 string. In this case, the name "raw" is used because the string will never be parsed to an object even if it is json.
     * Improvements to the naming are tracked in https://github.com/Azure/azure-functions-nodejs-worker/issues/294
     */
    rawBody?: any;

    /**
     * The raw Buffer representing the body before any decoding or parsing has been done
     */
    bufferBody?: Buffer;

    /**
     * Get the value of a particular header field
     */
    get(field: string): string | undefined;

    /**
     * Parses the body and returns an object representing a form
     * @throws if the content type is not "multipart/form-data" or "application/x-www-form-urlencoded"
     */
    parseFormBody(): Form;
}

export interface Form extends Iterable<[string, FormPart]> {
    /**
     * Returns the value of the first name-value pair whose name is `name`. If there are no such pairs, `null` is returned.
     */
    get(name: string): FormPart | null;

    /**
     * Returns the values of all name-value pairs whose name is `name`. If there are no such pairs, an empty array is returned.
     */
    getAll(name: string): FormPart[];

    /**
     * Returns `true` if there is at least one name-value pair whose name is `name`.
     */
    has(name: string): boolean;

    /**
     * The number of parts in this form
     */
    length: number;
}

export interface FormPart {
    /**
     * The value for this part of the form
     */
    value: Buffer;

    /**
     * The file name for this part of the form, if specified
     */
    fileName?: string;

    /**
     * The content type for this part of the form, assumed to be "text/plain" if not specified
     */
    contentType?: string;
}

/**
 * Possible values for an HTTP request method.
 */
export type HttpMethod = 'GET' | 'POST' | 'DELETE' | 'HEAD' | 'PATCH' | 'PUT' | 'OPTIONS' | 'TRACE' | 'CONNECT';

/**
 * Possible values for an HTTP Request user type
 */
export type HttpRequestUserType = 'AppService' | 'StaticWebApps';

/**
 * Http response object and methods.
 * This is the default of the res property in the Context object provided to your function when using HTTP triggers.
 */
export interface HttpResponseFull {
    /**
     * HTTP response headers.
     */
    headers?: HttpResponseHeaders;
    /**
     *  HTTP response cookies.
     */
    cookies?: Cookie[];
    /**
     * HTTP response body.
     */
    body?: any;
    /**
     * HTTP response status code.
     * @default 200
     */
    statusCode?: number | string;
    /**
     * Enable content negotiation of response body if true
     * If false, treat response body as raw
     * @default false
     */
    enableContentNegotiation?: boolean;
    /**
     * Sets the HTTP response status code
     * @returns the updated HttpResponseFull instance
     */
    status: (statusCode: number | string) => HttpResponseFull;
    /**
     * Sets a particular header field to a value
     * @returns the updated HttpResponseFull instance
     */
    setHeader(field: string, val: any): HttpResponseFull;
    /**
     * Has the same functionality as setHeader.
     * Sets a particular header field to a value
     * @returns the updated HttpResponseFull instance
     */
    header(field: string, val: any): HttpResponseFull;
    /**
     * Has the same functionality as setHeader.
     * Sets a particular header field to a value
     * @returns the updated HttpResponseFull instance
     */
    set(field: string, val: any): HttpResponseFull;
    /**
     * Get the value of a particular header field
     */
    getHeader(field: string): any;
    /**
     * Has the same functionality as getHeader
     * Get the value of a particular header field
     */
    get(field: string): any;
    /**
     * Removes a particular header field
     * @returns the updated HttpResponseFull instance
     */
    removeHeader(field: string): HttpResponseFull;
    /**
     * Set the 'Content-Type' header to a particular value
     * @returns the updated HttpResponseFull instance
     */
    type(type: string): HttpResponseFull;
    /**
     * Automatically sets the content-type then calls context.done()
     * @returns updated HttpResponseFull instance
     * @deprecated this method calls context.done() which is deprecated, use async/await and pass the response as the return value instead.
     * See the docs here for more information: https://aka.ms/functions-js-async-await
     */
    send(body?: any): HttpResponseFull;
    /**
     * Same as send()
     * Automatically sets the content-type then calls context.done()
     * @returns updated HttpResponseFull instance
     * @deprecated this method calls context.done() which is deprecated, use async/await and pass the response as your function's return value instead.
     * See the docs here for more information: https://aka.ms/functions-js-async-await
     */
    end(body?: any): HttpResponseFull;
    /**
     * Sets the status code then calls send()
     * @returns updated HttpResponseFull instance
     * @deprecated this method calls context.done() which is deprecated, use async/await and pass the response as your function's return value instead.
     * See the docs here for more information: https://aka.ms/functions-js-async-await
     */
    sendStatus(statusCode: string | number): HttpResponseFull;
    /**
     * Sets the 'Content-Type' header to 'application/json' then calls send(body)
     * @deprecated this method calls context.done() which is deprecated, use async/await and pass the response as your function's return value instead.
     * See the docs here for more information: https://aka.ms/functions-js-async-await
     */
    json(body?: any): void;
}

/**
 * Http response object.
 * This is not the default on the Context object, but you may replace context.res with an object of this type when using HTTP triggers.
 */
export interface HttpResponseSimple {
    /**
     * HTTP response headers.
     */
    headers?: HttpResponseHeaders;
    /**
     *  HTTP response cookies.
     */
    cookies?: Cookie[];
    /**
     * HTTP response body.
     */
    body?: any;
    /**
     * HTTP response status code.
     * This property takes precedence over the `status` property
     * @default 200
     */
    statusCode?: number | string;
    /**
     * HTTP response status code
     * The same as `statusCode`. This property is ignored if `statusCode` is set
     * @default 200
     */
    status?: number | string;
    /**
     * Enable content negotiation of response body if true
     * If false, treat response body as raw
     * @default false
     */
    enableContentNegotiation?: boolean;
}

/**
 * Http response type.
 */
export type HttpResponse = HttpResponseSimple | HttpResponseFull;

/**
 * Http response cookie object to "Set-Cookie"
 */
export interface Cookie {
    /** Cookie name */
    name: string;
    /** Cookie value */
    value: string;
    /** Specifies allowed hosts to receive the cookie */
    domain?: string;
    /** Specifies URL path that must exist in the requested URL */
    path?: string;
    /**
     * NOTE: It is generally recommended that you use maxAge over expires.
     * Sets the cookie to expire at a specific date instead of when the client closes.
     * This can be a Javascript Date or Unix time in milliseconds.
     */
    expires?: Date | number;
    /** Sets the cookie to only be sent with an encrypted request */
    secure?: boolean;
    /** Sets the cookie to be inaccessible to JavaScript's Document.cookie API */
    httpOnly?: boolean;
    /** Can restrict the cookie to not be sent with cross-site requests */
    sameSite?: 'Strict' | 'Lax' | 'None' | undefined;
    /** Number of seconds until the cookie expires. A zero or negative number will expire the cookie immediately. */
    maxAge?: number;
}
