/**
 * Defines the interface for an ideal filter algorithm.
 * An ideal filter should handle string set membership.
 */
interface IdealFilter {
  /**
   * Adds an item to the filter.
   * @param item The string item to add.
   */
  add(item: string): void;

  /**
   * Checks if an item is present in the filter.
   * For exact filters, returns true if added, false otherwise.
   * For probabilistic filters, returns true with a chance of false positives,
   * but never false negatives.
   * @param item The string item to check.
   * @returns True if the item is present (or possibly present for probabilistic filters), false otherwise.
   */
  check(item: string): boolean;

  /**
   * Clears all items from the filter, resetting its state.
   */
  clear(): void;

  /**
   * (Optional for an ideal filter, as not all filters support it correctly)
   * Attempts to remove an item from the filter.
   * Note: For probabilistic filters, deletion is complex and often not supported reliably
   * without false negatives. An ideal filter would handle this correctly.
   * @param item The string item to remove.
   */
  // delete?(item: string): void; // Uncomment if your filter implements deletion

  /**
   * (Optional for an ideal filter, for probabilistic filters only)
   * Returns the empirically measured false positive rate over a large sample of checks.
   * Requires a mechanism to track known non-members.
   */
  // getMeasuredFalsePositiveRate?(): number; // Uncomment if your filter is probabilistic and provides this
}

/**
 * A simple assertion utility for demonstration purposes.
 * Throws an error on failure to stop test execution immediately.
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    // throw new Error(`Assertion Failed: ${message}`); // Stop execution on first failure
  } else {
    console.log(`✅ Assertion Passed: ${message}`);
  }
}

/**
 * Executes a comprehensive set of tests against an IdealFilter implementation.
 * @param filter The filter instance to test.
 * @param description A description for the test suite.
 * @param isProbabilistic Set to true if the filter is probabilistic (e.g., Bloom Filter) to adjust false positive checks.
 */
function runFilterTests(
  filter: IdealFilter,
  description: string,
  isProbabilistic: boolean = false
): void {
  console.log(`\n--- Running Tests for: ${description} ---`);

  // --- Test Case 1: Initial State (Empty Filter) ---
  console.log("\n--- Test Case 1: Initial State ---");
  filter.clear(); // Ensure clean state
  assert(
    !filter.check("initial_test_item"),
    "1.1: Should return false for item not added in empty filter."
  );
  assert(
    !filter.check(""),
    "1.2: Should return false for empty string in empty filter."
  );

  // --- Test Case 2: Basic Add and Check ---
  console.log("\n--- Test Case 2: Basic Add and Check ---");
  filter.clear();
  filter.add("hello_world");
  assert(
    filter.check("hello_world"),
    "2.1: Should return true for an item immediately after adding."
  );
  assert(
    !filter.check("another_item"),
    "2.2: Should return false for a different item not added."
  );

  filter.add("alpha");
  filter.add("beta");
  filter.add("gamma");
  assert(
    filter.check("alpha"),
    "2.3: Should return true for 'alpha' after multiple adds."
  );
  assert(
    filter.check("beta"),
    "2.4: Should return true for 'beta' after multiple adds."
  );
  assert(
    filter.check("gamma"),
    "2.5: Should return true for 'gamma' after multiple adds."
  );
  assert(
    !filter.check("delta"),
    "2.6: Should return false for 'delta' not added."
  );

  // --- Test Case 3: Handling Duplicates ---
  console.log("\n--- Test Case 3: Handling Duplicates ---");
  filter.clear();
  filter.add("duplicate_item");
  filter.add("duplicate_item"); // Add again
  assert(
    filter.check("duplicate_item"),
    "3.1: Should remain true after adding the same item multiple times."
  );
  assert(
    !filter.check("unique_other_item"),
    "3.2: Should still be false for items not added, after duplicates."
  );

  // --- Test Case 4: Edge Cases - Empty String ---
  console.log("\n--- Test Case 4: Edge Cases - Empty String ---");
  filter.clear();
  filter.add("");
  assert(
    filter.check(""),
    "4.1: Should correctly handle and find an empty string."
  );
  assert(
    !filter.check("not_empty"),
    "4.2: Should return false for non-empty string when only empty string added."
  );

  // --- Test Case 5: Edge Cases - Special Characters & Unicode ---
  console.log(
    "\n--- Test Case 5: Edge Cases - Special Characters & Unicode ---"
  );
  filter.clear();
  const specialChars = "!@#$%^&*()_+{}[]|\\:;\"'<>,.?/";
  const unicodeEmojis = "👍🏽🚀💡✨🎉💯";
  const unicodeChinese = "你好世界，这是测试。";
  const longString = "a".repeat(1000); // Very long string

  filter.add(specialChars);
  filter.add(unicodeEmojis);
  filter.add(unicodeChinese);
  filter.add(longString);

  assert(
    filter.check(specialChars),
    "5.1: Should handle special characters correctly."
  );
  assert(
    filter.check(unicodeEmojis),
    "5.2: Should handle Unicode emojis correctly."
  );
  assert(
    filter.check(unicodeChinese),
    "5.3: Should handle multi-byte Unicode characters (Chinese) correctly."
  );
  assert(
    filter.check(longString),
    "5.4: Should handle very long strings correctly."
  );
  assert(
    !filter.check("not_special"),
    "5.5: Should return false for an unrelated string."
  );
  // Test exact match for ideal filter. A Bloom filter might fail this if the altered string hashes to existing bits.
  assert(
    !filter.check("👍🏽🚀💡✨🎉💯 "),
    "5.6: Should return false for altered unicode (extra space)."
  );

  // --- Test Case 6: False Negatives (CRITICAL) ---
  console.log("\n--- Test Case 6: False Negatives (CRITICAL) ---");
  filter.clear();
  const addedItems: string[] = [];
  for (let i = 0; i < 100; i++) {
    const item = `item_${Math.random().toString(36).substring(2, 15)}`;
    filter.add(item);
    addedItems.push(item);
  }

  for (const item of addedItems) {
    // A filter MUST NOT return false for an item that was added.
    assert(
      filter.check(item),
      `6.1: False Negative Check: Item '${item}' must be found after being added.`
    );
  }

  // --- Test Case 7: Capacity and Scaling ---
  console.log("\n--- Test Case 7: Capacity and Scaling ---");
  filter.clear();
  const numItems = 10000;
  const largeAddedItems: string[] = [];
  for (let i = 0; i < numItems; i++) {
    const item = `large_item_${i}_${Math.random()
      .toString(36)
      .substring(2, 10)}`;
    filter.add(item);
    largeAddedItems.push(item);
  }

  // Check a random subset of added items
  for (let i = 0; i < 100; i++) {
    const randomIndex = Math.floor(Math.random() * numItems);
    const item = largeAddedItems[randomIndex];
    assert(
      filter.check(item),
      `7.1: Found random added item '${item}' in large dataset.`
    );
  }

  // --- Test Case 8: False Positives ---
  console.log("\n--- Test Case 8: False Positives ---");
  let falsePositiveCount = 0;
  const numChecksForFPR = 1000;
  // Create a separate list of non-added items to check for false positives
  const nonAddedItemsForFPR: string[] = [];
  while (nonAddedItemsForFPR.length < numChecksForFPR) {
    const item = `non_added_fpr_item_${Math.random()
      .toString(36)
      .substring(2, 10)}`;
    // Ensure this item was definitively not part of the largeAddedItems
    if (!largeAddedItems.includes(item)) {
      nonAddedItemsForFPR.push(item);
      if (filter.check(item)) {
        falsePositiveCount++;
      }
    }
  }

  console.log(
    `8.1: Checked ${numChecksForFPR} non-added items. False positives observed: ${falsePositiveCount}.`
  );

  if (isProbabilistic) {
    // For a probabilistic filter, false positives are expected but should be within a reasonable range.
    // We cannot assert 'falsePositiveCount === 0'. Instead, you might assert
    // `falsePositiveCount / numChecksForFPR < expectedMaxFalsePositiveRate`
    // For this generic test, we'll just log if it's not zero.
    if (falsePositiveCount > 0) {
      console.warn(
        `⚠️ Warning: Probabilistic filter exhibited ${falsePositiveCount} false positives out of ${numChecksForFPR} checks.`
      );
    } else {
      console.log(
        "✅ Assertion Passed: 8.2: Probabilistic filter showed no false positives (lucky run or very small FPA)."
      );
    }
  } else {
    // For a perfect filter, there should be ZERO false positives.
    assert(
      falsePositiveCount === 0,
      "8.2: For a perfect filter, no false positives should be observed."
    );
  }

  // --- Test Case 9: Deletion (If filter supports *correct* deletion) ---
  console.log("\n--- Test Case 9: Deletion (If supported correctly) ---");
  // Uncomment and adapt if your filter truly supports robust deletion
  /*
  if ('delete' in filter && typeof filter.delete === 'function') { // Check if delete method exists
    filter.clear();
    filter.add("delete_me");
    filter.add("keep_me");
    filter.add("another_item");

    assert(filter.check("delete_me"), "9.1: 'delete_me' should be present before deletion.");
    (filter as any).delete("delete_me"); // Type assertion needed if interface doesn't include it
    assert(!filter.check("delete_me"), "9.2: 'delete_me' should not be present after deletion.");
    assert(filter.check("keep_me"), "9.3: 'keep_me' should still be present after 'delete_me' removed.");
    assert(filter.check("another_item"), "9.4: 'another_item' should still be present after 'delete_me' removed.");

    // Test deleting a non-existent item
    // You'd need a way to track the internal size of your filter for this assert
    // const initialSize = addedItems.length;
    (filter as any).delete("non_existent_item");
    // assert(filter.size() === initialSize, "9.5: Deleting non-existent item should not change filter size.");
    assert(filter.check("keep_me"), "9.6: Filter should not be broken after deleting non-existent item.");

    // Test cascade deletion issue (critical for simple bit arrays like your factor-based one)
    filter.clear();
    filter.add("abc");
    filter.add("acb"); // If these share internal hash/bits, deletion might affect both
    assert(filter.check("abc"), "9.7: 'abc' present before cascade test.");
    assert(filter.check("acb"), "9.8: 'acb' present before cascade test.");
    (filter as any).delete("abc");
    // For a filter with correct deletion, 'acb' should *still* be present.
    // For simple bit arrays where 'a','b','c' bits are shared, this would fail.
    // An ideal filter's delete should only affect the specified item.
    assert(filter.check("acb"), "9.9: 'acb' should NOT be affected by deletion of 'abc' (no cascade delete).");
  } else {
    console.warn("Deletion is not implemented or not correctly supported by this filter.");
  }
  */

  // --- Test Case 10: Clear/Reset ---
  console.log("\n--- Test Case 10: Clear/Reset ---");
  filter.add("item_to_clear");
  assert(
    filter.check("item_to_clear"),
    "10.1: Item should be present before clear."
  );
  filter.clear();
  assert(
    !filter.check("item_to_clear"),
    "10.2: Item should not be present after clear."
  );
  assert(
    !filter.check("any_new_item"),
    "10.3: Filter should be empty after clear."
  );

  console.log(`\n--- All Tests for ${description} Completed ---`);
}

// --- ACTUAL FILTER IMPLEMENTATIONS ---

/**
 * MyExampleFilter: A perfect filter using TypeScript's built-in Set.
 * This should pass ALL tests including zero false positives.
 */
class MyExampleFilter implements IdealFilter {
  private items = new Set<string>();

  add(item: string): void {
    this.items.add(item);
  }

  check(item: string): boolean {
    return this.items.has(item);
  }

  clear(): void {
    this.items.clear();
  }
}

/**
 * MyBloomFilter: A simplified Bloom filter implementation.
 * This will exhibit false positives (Test Case 8), which is expected behavior for a probabilistic filter.
 * NOT PRODUCTION-READY (e.g., uses a naive hash function, doesn't handle very large numbers correctly for `size`).
 */
class MyBloomFilter implements IdealFilter {
  private bitArray: Uint8Array;
  private sizeInBits: number; // Size of bitArray in bits
  private numHashFunctions: number;

  constructor(expectedItems: number, falsePositiveRate: number) {
    // Calculate optimal m (size in bits) and k (numHashFunctions)
    // Formulas:
    // m = -(n * ln(p)) / (ln(2)^2)
    // k = (m/n) * ln(2)
    const n = expectedItems;
    const p = falsePositiveRate;
    const ln2_squared = Math.log(2) ** 2;

    this.sizeInBits = Math.ceil(-(n * Math.log(p)) / ln2_squared);
    this.numHashFunctions = Math.round((this.sizeInBits / n) * Math.log(2));

    // Ensure minimums
    if (this.sizeInBits < 8) this.sizeInBits = 8; // At least one byte
    if (this.numHashFunctions < 1) this.numHashFunctions = 100;

    this.bitArray = new Uint8Array(Math.ceil(this.sizeInBits / 8));
    this.bitArray.fill(0); // Initialize all bits to 0

    console.log(
      `Bloom filter configured: bits = ${this.sizeInBits}, hashes = ${this.numHashFunctions}`
    );
  }

  // Simple string hash function (FNV-1a-like for demonstration, not cryptographically strong)
  private simpleHash(item: string, seed: number): number {
    let hash = 2166136261 ^ seed; // FNV_offset_basis XOR seed
    for (let i = 0; i < item.length; i++) {
      hash ^= item.charCodeAt(i); // XOR with character code
      hash +=
        (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24); // Add hash to itself multiple times
      // Ensure positive and fit within 32-bit (simulate unsigned)
      hash = hash >>> 0; // Ensure positive
    }
    return hash;
  }

  // Generate multiple hashes (using different seeds)
  private getHashes(item: string): number[] {
    const hashes: number[] = [];
    let currentHash = this.simpleHash(item, 0); // Use 0 as initial seed
    hashes.push(currentHash % this.sizeInBits);

    // Generate additional hashes using linear congruential generator or similar
    // A common approach for Bloom filters is to derive k hashes from 2 base hashes:
    // g_i(x) = (h1(x) + i * h2(x)) mod m
    // For simplicity here, we'll just use different seeds for `simpleHash`
    for (let i = 1; i < this.numHashFunctions; i++) {
      currentHash = this.simpleHash(item, i); // Use i as different seed
      hashes.push(currentHash % this.sizeInBits);
    }
    return hashes;
  }

  add(item: string): void {
    const hashes = this.getHashes(item);
    for (const hashVal of hashes) {
      const bitIndex = hashVal;
      const byteIndex = Math.floor(bitIndex / 8);
      const bitPositionInByte = bitIndex % 8;
      this.bitArray[byteIndex] |= 1 << bitPositionInByte;
    }
  }

  check(item: string): boolean {
    const hashes = this.getHashes(item);
    for (const hashVal of hashes) {
      const bitIndex = hashVal;
      const byteIndex = Math.floor(bitIndex / 8);
      const bitPositionInByte = bitIndex % 8;
      // If any required bit is NOT set, the item is definitely not in the filter
      if (!((this.bitArray[byteIndex] >> bitPositionInByte) & 1)) {
        return false;
      }
    }
    return true; // All required bits are set, item might be in the filter (possible false positive)
  }

  clear(): void {
    this.bitArray.fill(0);
  }
}

// --- Instantiate and run tests for both filter types ---

// 1. Test the "Perfect Filter" (using Set)
const perfectFilter = new MyExampleFilter();
try {
  runFilterTests(perfectFilter, "My Example Perfect Filter (using Set)", false);
} catch (e) {
  console.error("Perfect Filter tests failed:", e);
}

// 2. Test the "Probabilistic Filter" (Bloom-like)
// Configure for 10,000 items with an expected 1% false positive rate
const probabilisticFilter = new MyBloomFilter(1_000_000, 0.01);
try {
  runFilterTests(
    probabilisticFilter,
    "My Example Probabilistic Filter (Bloom-like)",
    true
  );
} catch (e) {
  console.error("Probabilistic Filter tests failed:", e);
}
