import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function endpoint() {
  const configured = process.env.CLOUDFLARE_R2_ENDPOINT?.trim();
  if (!configured) return `https://${required("CLOUDFLARE_R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`;
  if (/\r|\n/.test(configured)) throw new Error("invalid_cloudflare_r2_endpoint");
  const url = new URL(configured);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".r2.cloudflarestorage.com")) throw new Error("invalid_cloudflare_r2_endpoint");
  return url.origin;
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value || /[\r\n]/.test(value)) throw new Error(`invalid_${name.toLowerCase()}`);
  return value;
}

export function isR2Configured() {
  return ["CLOUDFLARE_R2_ACCOUNT_ID", "CLOUDFLARE_R2_ACCESS_KEY_ID", "CLOUDFLARE_R2_SECRET_ACCESS_KEY", "CLOUDFLARE_R2_BUCKET"].every((name) => Boolean(process.env[name]?.trim()));
}

function client() {
  return new S3Client({
    region: "auto",
    endpoint: endpoint(),
    credentials: {
      accessKeyId: required("CLOUDFLARE_R2_ACCESS_KEY_ID"),
      secretAccessKey: required("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
    },
  });
}

const bucket = () => required("CLOUDFLARE_R2_BUCKET");

export async function createR2MultipartUpload(key: string, contentType: string, metadata: Record<string, string>) {
  const result = await client().send(new CreateMultipartUploadCommand({
    Bucket: bucket(), Key: key, ContentType: contentType, CacheControl: "private, max-age=0, no-store", Metadata: metadata,
  }));
  if (!result.UploadId) throw new Error("r2_upload_id_missing");
  return result.UploadId;
}

export function signR2UploadPart(key: string, uploadId: string, partNumber: number) {
  return getSignedUrl(client(), new UploadPartCommand({ Bucket: bucket(), Key: key, UploadId: uploadId, PartNumber: partNumber }), { expiresIn: 900 });
}

export async function completeR2MultipartUpload(key: string, uploadId: string, parts: Array<{ ETag: string; PartNumber: number }>) {
  await client().send(new CompleteMultipartUploadCommand({ Bucket: bucket(), Key: key, UploadId: uploadId, MultipartUpload: { Parts: parts } }));
  return client().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
}

export function abortR2MultipartUpload(key: string, uploadId: string) {
  return client().send(new AbortMultipartUploadCommand({ Bucket: bucket(), Key: key, UploadId: uploadId }));
}

export function deleteR2Object(key: string) {
  return client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

export function copyR2Object(sourceKey: string, destinationKey: string, contentType: string) {
  return client().send(new CopyObjectCommand({ Bucket: bucket(), Key: destinationKey, CopySource: `${bucket()}/${encodeURIComponent(sourceKey).replace(/%2F/g, "/")}`, ContentType: contentType, MetadataDirective: "REPLACE" }));
}

export function signR2ReadUrl(key: string, expiresIn = 900) {
  return getSignedUrl(client(), new GetObjectCommand({ Bucket: bucket(), Key: key }), { expiresIn });
}

export function r2MaxUploadBytes() {
  const configured = Number(process.env.R2_MAX_UPLOAD_BYTES);
  return Number.isSafeInteger(configured) && configured > 0 ? configured : 20 * 1024 ** 3;
}
