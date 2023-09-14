/*
 * Copyright (c) 2023 SAP SE or an SAP affiliate company. All rights reserved.
 *
 * This is a generated file powered by the SAP Cloud SDK for JavaScript.
 */
import type { ResourceGroupId2 } from './resource-group-id-2';
import type { ResourceGroupName } from './resource-group-name';
import type { Label2 } from './label-2';
/**
 * Representation of the 'ResourceGroupBaseInfo' schema.
 */
export type ResourceGroupBaseInfo =
  | {
      id: ResourceGroupId2;
      name: ResourceGroupName;
      /**
       * Arbitrary labels as meta information
       */
      labels?: Label2[];
    }
  | Record<string, any>;
