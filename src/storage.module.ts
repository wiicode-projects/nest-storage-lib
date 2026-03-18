import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import {
  StorageModuleOptions,
  StorageModuleAsyncOptions,
  StorageModuleOptionsFactory,
} from './storage.interfaces';
import { STORAGE_MODULE_OPTIONS } from './storage.constants';
import { StorageService } from './storage.service';

@Global()
@Module({})
export class StorageModule {
  static forRoot(options: StorageModuleOptions): DynamicModule {
    return {
      module: StorageModule,
      providers: [
        {
          provide: STORAGE_MODULE_OPTIONS,
          useValue: options,
        },
        StorageService,
      ],
      exports: [StorageService],
    };
  }

  static forRootAsync(options: StorageModuleAsyncOptions): DynamicModule {
    const asyncProviders = this.createAsyncProviders(options);

    return {
      module: StorageModule,
      imports: options.imports || [],
      providers: [...asyncProviders, StorageService],
      exports: [StorageService],
    };
  }

  private static createAsyncProviders(
    options: StorageModuleAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: STORAGE_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ];
    }

    const useClass = options.useClass || options.useExisting;
    if (!useClass) {
      throw new Error(
        'StorageModule.forRootAsync() requires useFactory, useClass, or useExisting',
      );
    }

    const providers: Provider[] = [
      {
        provide: STORAGE_MODULE_OPTIONS,
        useFactory: async (factory: StorageModuleOptionsFactory) =>
          factory.createStorageOptions(),
        inject: [useClass],
      },
    ];

    if (options.useClass) {
      providers.push({ provide: useClass, useClass });
    }

    return providers;
  }
}
