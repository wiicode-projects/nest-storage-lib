import { Inject, Injectable } from '@nestjs/common';
import { STORAGE_MODULE_OPTIONS } from './storage.constants';
import {
  CompressedFile,
  CompressOptions,
  DeleteResponse,
  FileInput,
  StorageModuleOptions,
  UploadedFile,
} from './storage.interfaces';
import FormData from 'form-data';

@Injectable()
export class StorageService {
  private readonly endpoint: string;
  private readonly apiKey: string;

  constructor(
    @Inject(STORAGE_MODULE_OPTIONS) options: StorageModuleOptions,
  ) {
    this.endpoint = options.storageEndpoint.replace(/\/+$/, '');
    this.apiKey = options.apiKey;
  }

  /**
   * Upload a single file to storage (max 10 MB).
   *
   * @param file - The file to upload (buffer + original name + optional mimetype).
   * @param inputName - Form field name; also used as a subfolder on the server.
   * @param path - Subdirectory path where the file will be stored.
   * @returns The uploaded file metadata including its public URL.
   * @throws {Error} If the upload request fails.
   */
  async upload(
    file: FileInput,
    inputName: string,
    path: string,
  ): Promise<UploadedFile> {
    const form = new FormData();
    form.append(inputName, file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });
    form.append('path', path);

    const res = await fetch(`${this.endpoint}/api/upload`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        ...form.getHeaders(),
      },
      body: form.getBuffer(),
    });

    if (!res.ok) {
      throw new Error(
        `Storage upload failed: ${res.status} ${await res.text()}`,
      );
    }

    const data: any = await res.json();
    return data.file ?? data;
  }

  /**
   * Upload multiple files simultaneously (max 10 MB each).
   *
   * @param files - Array of files to upload.
   * @param inputName - Form field name; also used as a subfolder on the server.
   * @param path - Optional subdirectory path where files will be stored.
   * @returns Array of uploaded file metadata.
   * @throws {Error} If the upload request fails.
   */
  async uploadMultiple(
    files: FileInput[],
    inputName: string,
    path?: string,
  ): Promise<UploadedFile[]> {
    const form = new FormData();
    for (const file of files) {
      form.append(`${inputName}[]`, file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
    }
    if (path) {
      form.append('path', path);
    }

    const res = await fetch(`${this.endpoint}/api/upload-multiple`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        ...form.getHeaders(),
      },
      body: form.getBuffer(),
    });

    if (!res.ok) {
      throw new Error(
        `Storage upload-multiple failed: ${res.status} ${await res.text()}`,
      );
    }

    const data: any = await res.json();
    return data.files ?? data;
  }

  /**
   * Upload multiple image files with server-side compression.
   *
   * @param files - Array of image files to upload and compress.
   * @param inputName - Form field name; also used as a subfolder on the server.
   * @param path - Optional subdirectory path where files will be stored.
   * @param options - Optional compression settings.
   * @param options.quality - Compression quality from 1 to 100 (default: 80).
   * @param options.maxWidth - Maximum width in pixels, minimum 100 (default: 2000).
   * @param options.maxHeight - Maximum height in pixels, minimum 100 (default: 2000).
   * @returns Array of compressed file metadata including dimensions.
   * @throws {Error} If the upload request fails.
   */
  async uploadCompressed(
    files: FileInput[],
    inputName: string,
    path?: string,
    options?: CompressOptions,
  ): Promise<CompressedFile[]> {
    const form = new FormData();
    for (const file of files) {
      form.append(`${inputName}[]`, file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
    }
    if (path) {
      form.append('path', path);
    }
    if (options?.quality !== undefined) {
      form.append('quality', String(options.quality));
    }
    if (options?.maxWidth !== undefined) {
      form.append('max_width', String(options.maxWidth));
    }
    if (options?.maxHeight !== undefined) {
      form.append('max_height', String(options.maxHeight));
    }

    const res = await fetch(
      `${this.endpoint}/api/upload-multiple-compressed`,
      {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey,
          ...form.getHeaders(),
        },
        body: form.getBuffer(),
      },
    );

    if (!res.ok) {
      throw new Error(
        `Storage upload-compressed failed: ${res.status} ${await res.text()}`,
      );
    }

    const data: any = await res.json();
    return data.files ?? data;
  }

  /**
   * Delete a file from storage.
   *
   * @param filePath - Full URL or relative path of the file to remove.
   * @returns Confirmation message from the server.
   * @throws {Error} If the delete request fails.
   */
  async delete(filePath: string): Promise<DeleteResponse> {
    const res = await fetch(`${this.endpoint}/api/files`, {
      method: 'DELETE',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: filePath }),
    });

    if (!res.ok) {
      throw new Error(
        `Storage delete failed: ${res.status} ${await res.text()}`,
      );
    }

    return res.json() as Promise<DeleteResponse>;
  }
}
