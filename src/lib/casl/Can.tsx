/**
 * CASL React Context
 *
 * Provides ability instance to React components
 */

import { createContext } from "react";
import { createContextualCan } from "@casl/react";
import { createMongoAbility } from "@casl/ability";
import type { AppAbility } from "./ability";

// Create context with default empty ability
export const AbilityContext = createContext<AppAbility>(createMongoAbility());

// Create Can component for conditional rendering
export const Can = createContextualCan(AbilityContext.Consumer);
