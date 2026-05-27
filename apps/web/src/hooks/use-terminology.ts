"use client";

import { createContext, useContext } from "react";

interface Terminology {
  visit: string;
  client: string;
  worker: string;
  trip: string;
}

const defaultTerminology: Terminology = {
  visit: "Visit",
  client: "Patient",
  worker: "Caregiver",
  trip: "Trip",
};

const TerminologyContext = createContext<Terminology>(defaultTerminology);

export function useTerminology() {
  return useContext(TerminologyContext);
}

export function useTerm(key: keyof Terminology): string {
  const terms = useTerminology();
  return terms[key];
}

export { TerminologyContext, defaultTerminology };
export type { Terminology };
