export type Outcomes = [() => void, () => void]

export function decide(decision: boolean, outcomes: Outcomes): void {
  if (decision) {
    outcomes[0]()
  } else {
    outcomes[1]()
  }
}
