/*
 * Copyright (c) 2023 SAP SE or an SAP affiliate company. All rights reserved.
 *
 * This is a generated file powered by the SAP Cloud SDK for JavaScript.
 */
import type { ObjectStoreSecretStatusMetadata } from './object-store-secret-status-metadata';
/**
 * This represents the meta-data of a stored secret. The 'data' field of the secret is never retrieved.
 */
export type ObjectStoreSecretStatus =
  | {
      metadata?: ObjectStoreSecretStatusMetadata;
      /**
       * Name of objectstore
       * @example "myobjectstore-object-store-secret"
       */
      name?: string;
    }
  | Record<string, any>;
