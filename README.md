# @wiicode-projects/storage

NestJS library for uploading and managing files on [Wiicode Storage](https://storage.wiicode.org).

## Installation

```bash
npm install @wiicode-projects/storage
```

**Peer dependencies** (must already be in your NestJS project):

```
@nestjs/common  ^10 || ^11
@nestjs/core    ^10 || ^11
```

## Setup

### Basic

```typescript
import { Module } from '@nestjs/common';
import { StorageModule } from '@wiicode-projects/storage';

@Module({
  imports: [
    StorageModule.forRoot({
      apiKey: 'your-api-key',
      storageEndpoint: 'https://storage.wiicode.org',
    }),
  ],
})
export class AppModule {}
```

### Async (with ConfigService)

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageModule } from '@wiicode-projects/storage';

@Module({
  imports: [
    ConfigModule.forRoot(),
    StorageModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        apiKey: config.getOrThrow('STORAGE_API_KEY'),
        storageEndpoint: config.getOrThrow('STORAGE_ENDPOINT'),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### Async (with class factory)

```typescript
import { Injectable } from '@nestjs/common';
import {
  StorageModuleOptionsFactory,
  StorageModuleOptions,
} from '@wiicode-projects/storage';

@Injectable()
export class StorageConfigService implements StorageModuleOptionsFactory {
  createStorageOptions(): StorageModuleOptions {
    return {
      apiKey: process.env.STORAGE_API_KEY!,
      storageEndpoint: process.env.STORAGE_ENDPOINT!,
    };
  }
}

// In your module:
StorageModule.forRootAsync({
  useClass: StorageConfigService,
});
```

The module is **global** — once registered, `StorageService` is injectable anywhere without re-importing.

## API

### `StorageService`

All methods accept a `FileInput` object compatible with `Express.Multer.File`:

```typescript
interface FileInput {
  buffer: Buffer;
  originalname: string;
  mimetype?: string;
}
```

---

#### `upload(file, inputName, path): Promise<UploadedFile>`

Upload a single file (max 10 MB).

| Parameter   | Type        | Description                                          |
|-------------|-------------|------------------------------------------------------|
| `file`      | `FileInput` | The file to upload                                   |
| `inputName` | `string`    | Field name — also used as a subfolder on the server  |
| `path`      | `string`    | Subdirectory path for storage                        |

```typescript
@Post('avatar')
@UseInterceptors(FileInterceptor('avatar'))
async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
  return this.storage.upload(file, 'avatar', 'users/avatars');
}
```

**Returns:**

```typescript
interface UploadedFile {
  originalName: string;
  generatedName: string;
  path: string;
  url: string;
}
```

---

#### `uploadMultiple(files, inputName, path?): Promise<UploadedFile[]>`

Upload multiple files at once (max 10 MB each).

| Parameter   | Type          | Description                         |
|-------------|---------------|-------------------------------------|
| `files`     | `FileInput[]` | Array of files to upload            |
| `inputName` | `string`      | Field name                          |
| `path`      | `string?`     | Optional subdirectory path          |

```typescript
@Post('gallery')
@UseInterceptors(FilesInterceptor('photos'))
async uploadGallery(@UploadedFiles() files: Express.Multer.File[]) {
  return this.storage.uploadMultiple(files, 'photos', 'gallery');
}
```

---

#### `uploadCompressed(files, inputName, path?, options?): Promise<CompressedFile[]>`

Upload multiple images with server-side compression.

| Parameter   | Type               | Description                              |
|-------------|--------------------|------------------------------------------|
| `files`     | `FileInput[]`      | Array of image files                     |
| `inputName` | `string`           | Field name                               |
| `path`      | `string?`          | Optional subdirectory path               |
| `options`   | `CompressOptions?` | Compression settings (see below)         |

**`CompressOptions`:**

| Option      | Type      | Default | Description                       |
|-------------|-----------|---------|-----------------------------------|
| `quality`   | `number?` | `80`    | Compression quality (1–100)       |
| `maxWidth`  | `number?` | `2000`  | Max width in pixels (min 100)     |
| `maxHeight` | `number?` | `2000`  | Max height in pixels (min 100)    |

```typescript
@Post('blog-images')
@UseInterceptors(FilesInterceptor('images'))
async uploadBlogImages(@UploadedFiles() files: Express.Multer.File[]) {
  return this.storage.uploadCompressed(files, 'images', 'blog/posts', {
    quality: 75,
    maxWidth: 1200,
    maxHeight: 800,
  });
}
```

**Returns:**

```typescript
interface CompressedFile extends UploadedFile {
  compressed: boolean;
  width?: number;
  height?: number;
}
```

---

#### `delete(filePath): Promise<DeleteResponse>`

Delete a file from storage.

| Parameter  | Type     | Description                                |
|------------|----------|--------------------------------------------|
| `filePath` | `string` | Full URL or relative path to the file      |

```typescript
async removeFile(fileUrl: string) {
  return this.storage.delete(fileUrl);
}
```

## Full Example

```typescript
import { Injectable } from '@nestjs/common';
import { StorageService, CompressOptions } from '@wiicode-projects/storage';

@Injectable()
export class MediaService {
  constructor(private readonly storage: StorageService) {}

  async uploadProfilePicture(file: Express.Multer.File, userId: string) {
    return this.storage.upload(file, 'profile', `users/${userId}`);
  }

  async uploadDocuments(files: Express.Multer.File[]) {
    return this.storage.uploadMultiple(files, 'documents', 'uploads/docs');
  }

  async uploadOptimizedPhotos(files: Express.Multer.File[]) {
    return this.storage.uploadCompressed(files, 'photos', 'gallery', {
      quality: 80,
      maxWidth: 1600,
    });
  }

  async removeMedia(url: string) {
    return this.storage.delete(url);
  }
}
```

## Exports

```typescript
// Module
export { StorageModule } from './storage.module';

// Service
export { StorageService } from './storage.service';

// Interfaces
export {
  StorageModuleOptions,
  StorageModuleAsyncOptions,
  StorageModuleOptionsFactory,
  UploadedFile,
  CompressOptions,
  CompressedFile,
  DeleteResponse,
  FileInput,
} from './storage.interfaces';

// Constants
export { STORAGE_MODULE_OPTIONS } from './storage.constants';
```

## License

MIT
