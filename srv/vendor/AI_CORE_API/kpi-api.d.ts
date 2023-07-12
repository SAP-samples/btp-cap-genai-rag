/*
 * Copyright (c) 2023 SAP SE or an SAP affiliate company. All rights reserved.
 *
 * This is a generated file powered by the SAP Cloud SDK for JavaScript.
 */
import { OpenApiRequestBuilder } from '@sap-cloud-sdk/openapi';
import type {
  ResultSetDeprecated,
  ResultSet,
  ArrayOfColumnNames,
  ResourceGroupList
} from './schema';
/**
 * Representation of the 'KPIApi'.
 * This API is part of the 'AI_CORE_API' service.
 */
export declare const KPIApi: {
  /**
   * Fetch latest values of the total number of Executions, Artifacts and Deployments recorded against each ResourceGroup.
   * @returns The request builder, use the `execute()` method to trigger the request.
   */
  kpiGetKpisDeprecated: () => OpenApiRequestBuilder<ResultSetDeprecated>;
  /**
   * Retrieve the number of executions, artifacts, and deployments
   * for each resource group, scenario, and executable. The columns to be returned can be specified in a query parameter.
   *
   * @param queryParameters - Object containing the following keys: $select.
   * @returns The request builder, use the `execute()` method to trigger the request.
   */
  kpiGet: (queryParameters?: {
    $select?: ArrayOfColumnNames;
  }) => OpenApiRequestBuilder<ResultSet>;
  /**
   * Retrieve a list of the resourceGroups of the tenant
   * @returns The request builder, use the `execute()` method to trigger the request.
   */
  kpiQueryResourceGroups: () => OpenApiRequestBuilder<ResourceGroupList>;
};
