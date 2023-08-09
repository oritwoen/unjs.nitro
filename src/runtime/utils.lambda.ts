import type {
  APIGatewayProxyEventHeaders,
  CloudFrontHeaders,
  CloudFrontRequest,
} from "aws-lambda";

export function normalizeLambdaIncomingHeaders(
  headers?: APIGatewayProxyEventHeaders
) {
  return Object.fromEntries(
    Object.entries(headers || {}).map(([key, value]) => [
      key.toLowerCase(),
      value,
    ])
  );
}

export function normalizeLambdaOutgoingHeaders(
  headers: Record<string, number | string | string[] | undefined>,
  stripCookies = false
) {
  const entries = stripCookies
    ? Object.entries(headers).filter(([key]) => !["set-cookie"].includes(key))
    : Object.entries(headers);

  return Object.fromEntries(
    entries.map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : String(v)])
  );
}

// AWS Lambda proxy integrations requires base64 encoded buffers
// binaryMediaTypes should be */*
// see https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-payload-encodings.html
export function normalizeLambdaOutgoingBody(
  body: BodyInit,
  headers: Record<string, number | string | string[] | undefined>
): string {
  if (typeof body === "string") {
    return body;
  }
  if (!body) {
    return "";
  }
  if (Buffer.isBuffer(body)) {
    const contentType = (headers["content-type"] as string) || "";
    if (isTextType(contentType)) {
      return body.toString("utf8");
    }
    return body.toString("base64");
  }
  throw new Error(`Unsupported body type: ${typeof body}`);
}

// -- Internal --

const TEXT_TYPE_RE = /^text\/|\/(json|xml)|utf-?8/;

function isTextType(contentType = "") {
  return TEXT_TYPE_RE.test(contentType);
}

export function normalizeCloudfrontOutgoingHeaders(
  headers: Record<string, string | number | string[] | undefined>
): CloudFrontHeaders {
  return Object.fromEntries(
    Object.entries(headers)
      .filter(([key]) => !["content-length"].includes(key))
      .map(([key, v]) => [
        key,
        Array.isArray(v)
          ? v.map((value) => ({ key, value }))
          : [{ key, value: v.toString() }],
      ])
  );
}

export function normalizeCloudfrontIncomingHeaders(headers: CloudFrontHeaders) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, keyValues]) => [
      key,
      keyValues.map(({ value }) => value),
    ])
  );
}

export function normalizeCloudfrontBody(body?: CloudFrontRequest["body"]) {
  if (body === undefined) {
    return undefined;
  }

  const bodyString = body;
  if (body.encoding === "base64") {
    bodyString.data = Buffer.from(body.data, "base64").toString("utf8");
    bodyString.data = decodeURIComponent(bodyString.data);
  }
  return bodyString.data;
}
