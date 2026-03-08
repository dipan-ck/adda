import { Request, Response } from "express";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { z } from "zod";
import { s3 } from "../lib/aws";

const S3_BUCKET = process.env.AWS_S3_BUCKET!;
const SIGNED_URL_TTL_SECONDS = parseInt(process.env.SIGNED_URL_TTL_SECONDS!);
const MAX_FILE_SIZE_BYTES =
  Number(process.env.MAX_FILE_SIZE_BYTES) || 3221225472;
const SUPPORTED_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-matroska",
  "video/x-msvideo",
] as const;

console.log(MAX_FILE_SIZE_BYTES);

const signedUrlSchema = z.object({
  name: z.string().trim().min(1, "File name cannot be empty."),

  size: z
    .number()
    .int("File size must be an integer.")
    .positive("File size must be greater than 0.")
    .max(MAX_FILE_SIZE_BYTES, "File exceeds the maximum allowed size of 3 GB."),

  type: z.enum(SUPPORTED_MIME_TYPES),

  duration: z
    .number()
    .positive("Duration must be a positive number.")
    .optional(),
});

type SignedUrlBody = z.infer<typeof signedUrlSchema>;

export async function assignSignedUrl(
  req: Request,
  res: Response,
): Promise<Response> {
  const result = signedUrlSchema.safeParse(req.body);

  if (!result.success) {
    const errors = z.flattenError(result.error).fieldErrors;

    const hasOversizedFile = result.error.issues.some(
      (i) => i.path[0] === "size" && i.code === "too_big",
    );

    const hasUnsupportedType = result.error.issues.some(
      (i) => i.path[0] === "type" && i.code === "invalid_value",
    );

    const status = hasOversizedFile ? 413 : hasUnsupportedType ? 415 : 400;

    return res.status(status).json({
      error: "VALIDATION_ERROR",
      fields: errors,
    });
  }

  const { name, size, type, duration } = result.data satisfies SignedUrlBody;

  const sanitisedName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const s3Key = `stream_content/${randomUUID()}/${sanitisedName}`;

  try {
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      ContentType: type,
      ContentLength: size,
      Metadata: {
        originalName: name,
        ...(duration !== undefined && { duration: String(duration) }),
      },
    });

    const signedUrl = await getSignedUrl(s3, command, {
      expiresIn: SIGNED_URL_TTL_SECONDS,
    });

    return res.status(200).json({
      signedUrl,
      key: s3Key,
      expiresIn: SIGNED_URL_TTL_SECONDS,
    });
  } catch (err) {
    console.error("[assignSignedUrl] Failed to generate signed URL:", err);
    return res.status(500).json({
      error: "SIGNED_URL_FAILED",
      message: "Could not generate upload URL. Please try again.",
    });
  }
}
