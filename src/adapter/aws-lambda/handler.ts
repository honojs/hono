// @denoify-ignore
import crypto from 'crypto'
import type { Hono } from '../../hono'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
globalThis.crypto = crypto

// When calling Lambda directly through function urls
interface APIGatewayProxyEventV2 {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  rawPath: string;
  rawQueryString: string;
  body: string | null;
  isBase64Encoded: boolean;
  requestContext: {
    domainName: string;
  };
}

// When calling Lambda through API Gateway
interface APIGatewayProxyEvent {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  path: string;
  body: string | null;
  isBase64Encoded: boolean;
  requestContext: {
    domainName: string;
  };
}

interface APIGatewayProxyResult {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
  isBase64Encoded: boolean;
}

/**
 * Accepts events from API Gateway(`APIGatewayProxyEvent`) and directly through Function Url(`APIGatewayProxyEventV2`)
 */
export const handle = (app: Hono) => {
  return async (
    event: APIGatewayProxyEvent | APIGatewayProxyEventV2
  ): Promise<APIGatewayProxyResult> => {
    const req = createRequest(event);
    const res = await app.fetch(req);

    return createResult(res);
  };
};

async function createResult(res: Response): Promise<APIGatewayProxyResult> {
  const isBase64Encoded = res.body instanceof ReadableStream;
  const body = isBase64Encoded
    ? await fromReadableToString(res)
    : await fromBufferTostring(res);

  const result: APIGatewayProxyResult = {
    body,
    headers: {},
    statusCode: res.status,
    isBase64Encoded,
  };

  res.headers.forEach((value, key) => {
    result.headers[key] = value;
  });

  return result;
}

function createRequest(event: APIGatewayProxyEvent | APIGatewayProxyEventV2) {
  const url = isProxyEventV2(event)
    ? `https://${event.requestContext.domainName}${event.rawPath}?${event.rawQueryString}`
    : `https://${event.requestContext.domainName}${event.path}`;

  const headers = new Headers();
  for (const [k, v] of Object.entries(event.headers)) {
    if (v) headers.set(k, v);
  }

  const requestInit: RequestInit = {
    headers,
    method: event.httpMethod,
  };

  if (event.body) {
    requestInit.body = event.isBase64Encoded
      ? Buffer.from(event.body, "base64")
      : event.body;
  }

  return new Request(url, requestInit);
}

function isProxyEventV2(
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2
): event is APIGatewayProxyEventV2 {
  return event.hasOwnProperty("rawPath");
}

async function fromBufferTostring(res: Response) {
  const arrayBuffer = await res.arrayBuffer();
  return String.fromCharCode(...new Uint8Array(arrayBuffer));
}

async function fromReadableToString(res: Response) {
  const chunks = [];
  const stream = res.body || new ReadableStream();

  // @ts-ignore: asking for asyncIterator
  for await (let chunk of stream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("base64");
}
