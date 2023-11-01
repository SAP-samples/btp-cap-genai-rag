/*
 * Copyright (c) 2023 SAP SE or an SAP affiliate company. All rights reserved.
 *
 * This is a generated file powered by the SAP Cloud SDK for JavaScript.
 */

/**
 * Representation of the 'ResourceGroupOnboardingInfo' schema.
 */
export type ResourceGroupOnboardingInfo =
  | {
      /**
       * Timestamp of resource creation
       * @example "2021-02-24T01:45:30Z"
       * Format: "date-time".
       */
      createdAt: string;
      /**
       * @example "2021-02-24T01:45:30Z"
       * Format: "date-time".
       */
      deletedAt?: string;
      /**
       * @example "ACTIVE"
       */
      status: 'ACTIVE' | 'INACTIVE';
    }
  | Record<string, any>;
