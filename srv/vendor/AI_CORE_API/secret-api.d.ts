/*
 * Copyright (c) 2023 SAP SE or an SAP affiliate company. All rights reserved.
 *
 * This is a generated file powered by the SAP Cloud SDK for JavaScript.
 */
import { OpenApiRequestBuilder } from '@sap-cloud-sdk/openapi';
import type {
  ListGenericSecretsResponse,
  GenericSecretPostBody,
  GenericSecretPatchBody
} from './schema';
/**
 * Representation of the 'SecretApi'.
 * This API is part of the 'AI_CORE_API' service.
 */
export declare const SecretApi: {
  /**
   * Lists all secrets corresponding to tenant. This retrieves metadata only, not the secret data itself.
   * @param queryParameters - Object containing the following keys: $top, $skip.
   * @returns The request builder, use the `execute()` method to trigger the request.
   */
  kubesubmitV4GenericSecretsGet: (queryParameters?: {
    $top?: number;
    $skip?: number;
  }) => OpenApiRequestBuilder<ListGenericSecretsResponse>;
  /**
   * Create a new generic secret in the corresponding resource group or at main tenant level.
   * @param body - Request body.
   * @returns The request builder, use the `execute()` method to trigger the request.
   */
  kubesubmitV4GenericSecretsCreate: (
    body: GenericSecretPostBody
  ) => OpenApiRequestBuilder<any>;
  /**
   * Update secret credentials. Replace secret data with the provided data.
   * @param secretName - Path parameter.
   * @param body - Request body.
   * @returns The request builder, use the `execute()` method to trigger the request.
   */
  kubesubmitV4GenericSecretsUpdate: (
    secretName: string,
    body: GenericSecretPatchBody
  ) => OpenApiRequestBuilder<any>;
  /**
   * Deletes the secret from provided resource group namespace
   * @param secretName - Path parameter.
   * @returns The request builder, use the `execute()` method to trigger the request.
   */
  kubesubmitV4GenericSecretsDelete: (
    secretName: string
  ) => OpenApiRequestBuilder<any>;
};
