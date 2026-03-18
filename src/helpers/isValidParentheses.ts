/**
 * isValidParentheses — checks whether brackets in a string are correctly balanced.
 *
 * Returns true if every opening bracket has a matching, properly-nested closing
 * bracket and the string contains only bracket characters.
 * Returns false if the string contains non-bracket characters or if the brackets
 * are unbalanced or improperly nested.
 *
 * Supported bracket pairs: () [] {}
 *
 * @example
 * isValidParentheses('()')      // true
 * isValidParentheses('()[]{}'). // true
 * isValidParentheses('{[]}')    // true
 * isValidParentheses('(]')      // false — mismatched pair
 * isValidParentheses('([)]')    // false — improperly nested
 * isValidParentheses('')        // true  — empty string is vacuously valid
 */
export function isValidParentheses(s: string): boolean {
  const brackets: Record<string, string> = {
    ')': '(',
    ']': '[',
    '}': '{',
  };

  const openingBrackets = new Set(Object.values(brackets));
  const closingBrackets = new Set(Object.keys(brackets));

  const stack: string[] = [];

  for (const ch of s) {
    if (!openingBrackets.has(ch) && !closingBrackets.has(ch)) {
      return false;
    }

    if (openingBrackets.has(ch)) {
      stack.push(ch);
    } else {
      if (stack.length === 0 || stack[stack.length - 1] !== brackets[ch]) {
        return false;
      }
      stack.pop();
    }
  }

  return stack.length === 0;
}
