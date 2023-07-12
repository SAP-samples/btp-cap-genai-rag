"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KPIApi = void 0;
/*
 * Copyright (c) 2023 SAP SE or an SAP affiliate company. All rights reserved.
 *
 * This is a generated file powered by the SAP Cloud SDK for JavaScript.
 */
const openapi_1 = require("@sap-cloud-sdk/openapi");
/**
 * Representation of the 'KPIApi'.
 * This API is part of the 'AI_CORE_API' service.
 */
exports.KPIApi = {
    /**
     * Fetch latest values of the total number of Executions, Artifacts and Deployments recorded against each ResourceGroup.
     * @returns The request builder, use the `execute()` method to trigger the request.
     */
    kpiGetKpisDeprecated: () => new openapi_1.OpenApiRequestBuilder('get', '/lm/kpis'),
    /**
     * Retrieve the number of executions, artifacts, and deployments
     * for each resource group, scenario, and executable. The columns to be returned can be specified in a query parameter.
     *
     * @param queryParameters - Object containing the following keys: $select.
     * @returns The request builder, use the `execute()` method to trigger the request.
     */
    kpiGet: (queryParameters) => new openapi_1.OpenApiRequestBuilder('get', '/analytics/kpis', {
        queryParameters
    }),
    /**
     * Retrieve a list of the resourceGroups of the tenant
     * @returns The request builder, use the `execute()` method to trigger the request.
     */
    kpiQueryResourceGroups: () => new openapi_1.OpenApiRequestBuilder('get', '/analytics/resourceGroups')
};
//# sourceMappingURL=kpi-api.js.map