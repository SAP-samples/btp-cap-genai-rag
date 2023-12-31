/*
 * Copyright (c) 2023 SAP SE or an SAP affiliate company. All rights reserved.
 *
 * This is a generated file powered by the SAP Cloud SDK for JavaScript.
 */

/**
 * Representation of the 'AiApiLimitsDeployments' schema.
 */
export type AiApiLimitsDeployments =
  | {
      /**
       * Max nr of deployments allowed by this runtime per resource group. <0 means unlimited.
       * Default: -1.
       */
      maxRunningCount?: number;
    }
  | Record<string, any>;
