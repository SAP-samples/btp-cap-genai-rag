/*
 * Copyright (c) 2023 SAP SE or an SAP affiliate company. All rights reserved.
 *
 * This is a generated file powered by the SAP Cloud SDK for JavaScript.
 */
import type { Labeled } from './labeled';
/**
 * Representation of the 'ScenarioBaseData' schema.
 */
export type ScenarioBaseData =
  | (Labeled & {
      /**
       * Name of the scenario
       * Max Length: 256.
       */
      name: string;
      /**
       * Description of the scenario
       * Max Length: 5000.
       */
      description?: string;
    })
  | Record<string, any>;
