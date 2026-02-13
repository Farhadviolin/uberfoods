import { BadRequestException } from "@nestjs/common";

/**
 * Sanitization Utilities
 * Provides functions to sanitize user input and prevent XSS attacks
 */
export class SanitizeUtil {
  /**
   * Sanitizes a string by removing HTML tags and dangerous characters
   * @param input The string to sanitize
   * @param allowHtml Whether to allow HTML tags (default: false)
   * @returns The sanitized string
   */
  static sanitizeString(input: string, allowHtml: boolean = false): string {
    if (typeof input !== "string") {
      return "";
    }

    let sanitized = input.trim();

    if (!allowHtml) {
      // Remove HTML tags
      sanitized = sanitized.replace(/<[^>]*>/g, "");
      // Remove script tags and their content
      sanitized = sanitized.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        "",
      );
      // Remove event handlers
      sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");
      // Remove javascript: protocol
      sanitized = sanitized.replace(/javascript:/gi, "");
      // Remove data: protocol (can be used for XSS)
      sanitized = sanitized.replace(/data:/gi, "");
    }

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, "");

    return sanitized;
  }

  /**
   * Sanitizes an object by recursively sanitizing all string properties
   * @param obj The object to sanitize
   * @param allowHtml Whether to allow HTML tags
   * @returns The sanitized object
   */
  static sanitizeObject<T>(obj: T, allowHtml: boolean = false): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === "string") {
      return this.sanitizeString(obj, allowHtml) as T;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item, allowHtml)) as T;
    }

    if (typeof obj === "object") {
      const sanitized: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          sanitized[key] = this.sanitizeObject((obj as any)[key], allowHtml);
        }
      }
      return sanitized as T;
    }

    return obj;
  }

  /**
   * Validates and sanitizes a file path to prevent path traversal attacks
   * @param path The file path to validate
   * @param allowedBasePath The allowed base path
   * @returns The sanitized path
   * @throws BadRequestException if path traversal is detected
   */
  static sanitizeFilePath(path: string, allowedBasePath: string): string {
    if (typeof path !== "string") {
      throw new BadRequestException("Invalid file path");
    }

    // Remove path traversal sequences
    const sanitized = path
      .replace(/\.\./g, "")
      .replace(/\/\//g, "/")
      .replace(/^\/+/, "")
      .replace(/\/+$/, "");

    // Check if path is within allowed base path
    const resolvedPath = `${allowedBasePath}/${sanitized}`;
    if (!resolvedPath.startsWith(allowedBasePath)) {
      throw new BadRequestException("Path traversal detected");
    }

    return sanitized;
  }

  /**
   * Validates and sanitizes a URL
   * @param url The URL to validate
   * @param allowedProtocols Array of allowed protocols (default: ['http', 'https'])
   * @returns The sanitized URL
   * @throws BadRequestException if URL is invalid or uses disallowed protocol
   */
  static sanitizeUrl(
    url: string,
    allowedProtocols: string[] = ["http", "https"],
  ): string {
    if (typeof url !== "string") {
      throw new BadRequestException("Invalid URL");
    }

    try {
      const parsedUrl = new URL(url);
      const protocol = parsedUrl.protocol.replace(":", "");

      if (!allowedProtocols.includes(protocol)) {
        throw new BadRequestException(`Protocol ${protocol} is not allowed`);
      }

      // Remove dangerous characters from path
      parsedUrl.pathname = parsedUrl.pathname.replace(/[<>"']/g, "");

      return parsedUrl.toString();
    } catch (error) {
      throw new BadRequestException("Invalid URL format");
    }
  }

  /**
   * Validates and sanitizes an email address
   * @param email The email to validate
   * @returns The sanitized email
   * @throws BadRequestException if email is invalid
   */
  static sanitizeEmail(email: string): string {
    if (typeof email !== "string") {
      throw new BadRequestException("Invalid email");
    }

    const sanitized = email.trim().toLowerCase();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized)) {
      throw new BadRequestException("Invalid email format");
    }

    // Remove dangerous characters
    const dangerousChars = /[<>"']/g;
    if (dangerousChars.test(sanitized)) {
      throw new BadRequestException("Email contains invalid characters");
    }

    return sanitized;
  }

  /**
   * Validates file upload to prevent malicious files
   * @param filename The filename to validate
   * @param allowedExtensions Array of allowed file extensions
   * @param maxSize Maximum file size in bytes
   * @returns The sanitized filename
   * @throws BadRequestException if file is invalid
   */
  static validateFileUpload(
    filename: string,
    allowedExtensions: string[],
    maxSize?: number,
  ): string {
    if (typeof filename !== "string") {
      throw new BadRequestException("Invalid filename");
    }

    // Remove path traversal
    const sanitized = this.sanitizeFilePath(filename, "");

    // Check file extension
    const extension = sanitized.split(".").pop()?.toLowerCase();
    if (!extension || !allowedExtensions.includes(extension)) {
      throw new BadRequestException(
        `File extension .${extension} is not allowed. Allowed extensions: ${allowedExtensions.join(", ")}`,
      );
    }

    // Check for dangerous filenames
    const dangerousNames = ["index.html", "index.php", "shell.php", "cmd.exe"];
    if (dangerousNames.includes(sanitized.toLowerCase())) {
      throw new BadRequestException("Filename is not allowed");
    }

    return sanitized;
  }
}
