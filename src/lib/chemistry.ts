/** Parse a simple chemical formula like "C6H12O6", "Fe2O3", "CH3COOH", "Ca(OH)2" into atom counts. */
export function parseFormula(formula: string): Record<string, number> {
  const counts: Record<string, number> = {};
  const stack: Record<string, number>[] = [counts];
  const re = /([A-Z][a-z]?)(\d*)|(\()|(\))(\d*)/g;
  let m: RegExpExecArray | null;
  let consumed = 0;
  while ((m = re.exec(formula))) {
    consumed += m[0].length;
    if (m[1]) {
      const top = stack[stack.length - 1];
      top[m[1]] = (top[m[1]] ?? 0) + (m[2] ? Number(m[2]) : 1);
    } else if (m[3]) {
      stack.push({});
    } else if (m[4]) {
      const group = stack.pop()!;
      const mult = m[5] ? Number(m[5]) : 1;
      const top = stack[stack.length - 1];
      for (const [k, v] of Object.entries(group)) top[k] = (top[k] ?? 0) + v * mult;
    }
  }
  if (consumed !== formula.length || stack.length !== 1) throw new Error(`Cannot parse formula ${formula}`);
  return counts;
}

export interface Term {
  coeff: number;
  formula: string;
  name: string;
}

export function countSide(terms: Term[]): Record<string, number> {
  const total: Record<string, number> = {};
  for (const t of terms) {
    for (const [el, n] of Object.entries(parseFormula(t.formula))) total[el] = (total[el] ?? 0) + n * t.coeff;
  }
  return total;
}

export function isBalanced(left: Term[], right: Term[]): boolean {
  const a = countSide(left);
  const b = countSide(right);
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((k) => a[k] === b[k]);
}

/** Format "C6H12O6" with unicode subscripts. */
export function prettyFormula(f: string): string {
  const sub = '₀₁₂₃₄₅₆₇₈₉';
  return f.replace(/\d/g, (d) => sub[Number(d)]);
}
