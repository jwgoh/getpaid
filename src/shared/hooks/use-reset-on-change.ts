"use client";

import * as React from "react";

export function useResetOnChange(reset: () => void, deps: React.DependencyList): void {
  const [previousDeps, setPreviousDeps] = React.useState(deps);

  const hasChanged =
    previousDeps.length !== deps.length ||
    deps.some((dep, index) => !Object.is(dep, previousDeps[index]));

  if (hasChanged) {
    setPreviousDeps(deps);
    reset();
  }
}
