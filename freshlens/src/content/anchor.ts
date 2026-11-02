import { type Claim } from "../shared/contract";
import { textToRange, type TextSlice } from "./textmap";

export interface AnchorResult {
  claimId: string;
  range: Range | null;
  confidence: number;
  strategy: "span" | "exact" | "normalized" | "fuzzy" | "unanchored";
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSimilarity(a: string, b: string): number {
  const setA = new Set(normalize(a).split(" "));
  const setB = new Set(normalize(b).split(" "));
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  return (2 * intersection) / (setA.size + setB.size);
}

export function anchorClaim(
  claim: Claim,
  plainText: string,
  textMap: TextSlice[]
): AnchorResult {
  // Strategy 1: Direct span offset match if available
  if (claim.span) {
    const { start, end } = claim.span;
    if (start >= 0 && end <= plainText.length && start < end) {
      const sliceText = plainText.slice(start, end);
      if (normalize(sliceText) === normalize(claim.text)) {
        const range = textToRange(textMap, start, end);
        if (range) {
          return {
            claimId: claim.id,
            range,
            confidence: 1.0,
            strategy: "span",
          };
        }
      }
    }
  }

  // Strategy 2: Exact substring match in plainText
  const exactIndex = plainText.indexOf(claim.text);
  if (exactIndex !== -1) {
    const range = textToRange(textMap, exactIndex, exactIndex + claim.text.length);
    if (range) {
      return {
        claimId: claim.id,
        range,
        confidence: 0.95,
        strategy: "exact",
      };
    }
  }

  // Strategy 3: Normalized substring match
  const normPlainText = normalize(plainText);
  const normClaimText = normalize(claim.text);
  const normIndex = normPlainText.indexOf(normClaimText);
  if (normIndex !== -1) {
    // Approximate offsets in original text
    const wordsBefore = normPlainText.slice(0, normIndex).split(" ").length - 1;
    const claimWordCount = normClaimText.split(" ").length;
    const originalWords = plainText.split(/\s+/);

    let startChar = 0;
    for (let i = 0; i < wordsBefore && i < originalWords.length; i++) {
      startChar = plainText.indexOf(originalWords[i], startChar) + originalWords[i].length;
    }
    let endChar = startChar;
    for (let i = 0; i < claimWordCount && wordsBefore + i < originalWords.length; i++) {
      endChar = plainText.indexOf(originalWords[wordsBefore + i], endChar) + originalWords[wordsBefore + i].length;
    }

    if (endChar > startChar) {
      const range = textToRange(textMap, startChar, endChar);
      if (range) {
        return {
          claimId: claim.id,
          range,
          confidence: 0.88,
          strategy: "normalized",
        };
      }
    }
  }

  // Strategy 4: Fuzzy token window matching (threshold 0.85)
  const sentences = plainText.split(/[.?!]\s+/);
  let bestSentence = "";
  let bestScore = 0;
  for (const s of sentences) {
    const score = tokenSimilarity(s, claim.text);
    if (score > bestScore) {
      bestScore = score;
      bestSentence = s;
    }
  }

  if (bestScore >= 0.85 && bestSentence) {
    const idx = plainText.indexOf(bestSentence);
    if (idx !== -1) {
      const range = textToRange(textMap, idx, idx + bestSentence.length);
      if (range) {
        return {
          claimId: claim.id,
          range,
          confidence: bestScore,
          strategy: "fuzzy",
        };
      }
    }
  }

  return {
    claimId: claim.id,
    range: null,
    confidence: 0,
    strategy: "unanchored",
  };
}
