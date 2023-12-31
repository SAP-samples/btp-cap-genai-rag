/*
 * Copyright (c) 2023 SAP SE or an SAP affiliate company. All rights reserved.
 *
 * This is a generated file powered by the SAP Cloud SDK for JavaScript.
 */
import type { CreationResponse2 } from './creation-response-2';
import type { ArgoCDRepositoryDeletionResponseMessage } from './argo-cd-repository-deletion-response-message';
/**
 * Representation of the 'ArgoCDRepositoryDeletionResponse' schema.
 */
export type ArgoCDRepositoryDeletionResponse =
  | (CreationResponse2 & {
      message?: ArgoCDRepositoryDeletionResponseMessage;
    })
  | Record<string, any>;
