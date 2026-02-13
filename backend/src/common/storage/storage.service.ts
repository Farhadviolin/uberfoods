import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client | null = null;
  private bucketName: string;
  private region: string;
  private useS3: boolean;

  constructor(private configService: ConfigService) {
    const accessKeyId = this.configService.get<string>("AWS_ACCESS_KEY_ID");
    const secretAccessKey = this.configService.get<string>(
      "AWS_SECRET_ACCESS_KEY",
    );
    this.region = this.configService.get<string>("AWS_REGION", "eu-central-1");
    this.bucketName = this.configService.get<string>("AWS_S3_BUCKET", "");

    // Nur S3 verwenden wenn alle Credentials vorhanden sind
    this.useS3 = !!(accessKeyId && secretAccessKey && this.bucketName);

    if (this.useS3 && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: accessKeyId as string,
          secretAccessKey: secretAccessKey as string,
        },
      });
      this.logger.log("AWS S3 Storage aktiviert", "StorageService");
    } else {
      this.logger.warn(
        "AWS S3 nicht konfiguriert - verwende lokales File Storage",
        "StorageService",
      );
    }
  }

  /**
   * Lädt eine Datei hoch (S3 oder lokal)
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string,
    options?: { generateUniqueName?: boolean },
  ): Promise<string> {
    const generateUniqueName = options?.generateUniqueName ?? true;
    const filename = generateUniqueName
      ? `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.originalname}`
      : file.originalname;

    if (this.useS3 && this.s3Client) {
      return this.uploadToS3(file, folder, filename);
    } else {
      return this.uploadLocally(file, folder, filename);
    }
  }

  /**
   * Löscht eine Datei (S3 oder lokal)
   */
  async deleteFile(fileUrl: string): Promise<void> {
    if (
      (this.useS3 && fileUrl.startsWith("https://")) ||
      fileUrl.startsWith("http://")
    ) {
      // S3 URL - extrahiere Key
      const key = this.extractS3Key(fileUrl);
      if (key) {
        await this.deleteFromS3(key);
      }
    } else {
      // Lokale Datei
      await this.deleteLocally(fileUrl);
    }
  }

  /**
   * Prüft ob eine Datei existiert
   */
  async fileExists(fileUrl: string): Promise<boolean> {
    if (
      this.useS3 &&
      (fileUrl.startsWith("https://") || fileUrl.startsWith("http://"))
    ) {
      // S3 - könnte implementiert werden mit HeadObjectCommand
      return true; // Vereinfacht - in Production prüfen
    } else {
      // Lokal
      const filepath = path.join(process.cwd(), fileUrl);
      return fs.existsSync(filepath);
    }
  }

  /**
   * Upload zu S3
   */
  private async uploadToS3(
    file: Express.Multer.File,
    folder: string,
    filename: string,
  ): Promise<string> {
    if (!this.s3Client || !this.bucketName) {
      throw new BadRequestException("S3 nicht konfiguriert");
    }

    const key = `${folder}/${filename}`;
    const contentType = file.mimetype || "application/octet-stream";

    try {
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: contentType,
          ACL: "public-read", // Für öffentliche Dateien
        },
      });

      await upload.done();

      // Generiere öffentliche URL
      const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
      this.logger.log(`Datei zu S3 hochgeladen: ${key}`, "StorageService");
      return url;
    } catch (error) {
      this.logger.error(
        `Fehler beim S3-Upload: ${key}`,
        error instanceof Error ? error.stack : JSON.stringify(error),
        "StorageService",
      );
      throw error;
    }
  }

  /**
   * Upload lokal
   */
  private async uploadLocally(
    file: Express.Multer.File,
    folder: string,
    filename: string,
  ): Promise<string> {
    const uploadDir = path.join(process.cwd(), "uploads", folder);

    // Verzeichnis erstellen falls nicht vorhanden
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, file.buffer);

    return `/uploads/${folder}/${filename}`;
  }

  /**
   * Löscht von S3
   */
  private async deleteFromS3(key: string): Promise<void> {
    if (!this.s3Client || !this.bucketName) {
      return;
    }

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      this.logger.log(`Datei von S3 gelöscht: ${key}`, "StorageService");
    } catch (error) {
      this.logger.error(
        `Fehler beim S3-Löschen: ${key}`,
        error instanceof Error ? error.stack : JSON.stringify(error),
        "StorageService",
      );
    }
  }

  /**
   * Löscht lokal
   */
  private async deleteLocally(fileUrl: string): Promise<void> {
    try {
      const filepath = path.join(process.cwd(), fileUrl);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        this.logger.log(`Lokale Datei gelöscht: ${fileUrl}`, "StorageService");
      }
    } catch (error) {
      this.logger.error(
        `Fehler beim lokalen Löschen: ${fileUrl}`,
        error instanceof Error ? error.stack : JSON.stringify(error),
        "StorageService",
      );
    }
  }

  /**
   * Extrahiert S3 Key aus URL
   */
  private extractS3Key(url: string): string | null {
    try {
      const urlObj = new URL(url);
      // Entferne führenden Slash
      return urlObj.pathname.substring(1);
    } catch {
      return null;
    }
  }
}
