/**
 * usePermission Hook - CASL-based Permission Checks
 *
 * Simplified permission hook using CASL abilities
 */

import { useContext } from "react";
// Use relative imports to avoid IDE path-alias resolution issues
import { AbilityContext } from "../lib/casl/Can";
import type { Action, Subject } from "../lib/casl/types";
import type { AppAbility } from "../lib/casl/ability";

export function usePermission() {
  const ability = useContext(AbilityContext) as AppAbility;

  /**
   * Check if user can perform action on subject
   * @example can('view', 'User')
   */
  const can = (action: Action, subject: Subject): boolean => {
    return Boolean(ability?.can(action, subject));
  };

  /**
   * Check if user cannot perform action on subject
   * @example cannot('delete', 'User')
   */
  const cannot = (action: Action, subject: Subject): boolean => {
    return Boolean(ability?.cannot(action, subject));
  };

  /**
   * Check if user can perform ANY of the specified actions
   * @example canAny([['view', 'User'], ['edit', 'User']])
   */
  const canAny = (permissions: Array<[Action, Subject]>): boolean => {
    return permissions.some(([action, subject]) => Boolean(ability?.can(action, subject)));
  };

  /**
   * Check if user can perform ALL of the specified actions
   * @example canAll([['view', 'User'], ['edit', 'User']])
   */
  const canAll = (permissions: Array<[Action, Subject]>): boolean => {
    return permissions.every(([action, subject]) => Boolean(ability?.can(action, subject)));
  };

  return {
    ability,
    can,
    cannot,
    canAny,
    canAll,
  };
}
