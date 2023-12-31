/*
 * Copyright (c) 2023 SAP SE or an SAP affiliate company. All rights reserved.
 *
 * This is a generated file powered by the SAP Cloud SDK for JavaScript.
 */

/**
 * Services that support patch on /executions and /deployments to change targetStatus of multiple executions and deployments.
 */
export type AiApiCapabilitiesBulkUpdates =
  | {
      executions?: boolean;
      deployments?: boolean;
    }
  | Record<string, any>;
