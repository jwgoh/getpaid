"use client";

import * as React from "react";

const subscribe = () => () => {};

const getSnapshot = (): boolean => true;

const getServerSnapshot = (): boolean => false;

export function useHydrated(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
