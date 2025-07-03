// src/utils/MathUtils.ts
import { Cell } from "../models/Cell.js";

/**
 * Utility class for mathematical operations on cells
 */
export class MathUtils {
    // Constants for optimization
    private static readonly LARGE_DATASET_THRESHOLD = 10000;
    private static readonly BATCH_SIZE = 5000;

    /**
     * Calculates statistical values from an array of cells
     * @param {Cell[]} cells Array of cells to calculate statistics from
     * @returns {Object} Object containing count, sum, min, max, and average values
     */
    public static calculateStats(cells: Cell[]): {
        count: number;
        sum: number;
        min: number;
        max: number;
        average: number;
    } {
        // Early exit for empty cells array
        if (cells.length === 0) {
            return {
                count: 0,
                sum: 0,
                min: 0,
                max: 0,
                average: 0,
            };
        }

        // Process in batches to avoid collecting all values at once
        let count = 0;
        let sum = 0;
        let min = Number.POSITIVE_INFINITY;
        let max = Number.NEGATIVE_INFINITY;

        // Process cells directly without creating intermediate array
        for (let i = 0; i < cells.length; i++) {
            const value = cells[i].getNumericValue();
            if (value !== null) {
                count++;
                sum += value;

                // Update min/max without using Math.min/max with spread operator
                if (value < min) min = value;
                if (value > max) max = value;
            }
        }

        // Handle case when no numeric values found
        if (count === 0) {
            return {
                count: 0,
                sum: 0,
                min: 0,
                max: 0,
                average: 0,
            };
        }

        const average = sum / count;

        return {
            count,
            sum,
            min,
            max,
            average,
        };
    }

    /**
     * Calculates statistics for extremely large datasets
     * Uses batch processing to avoid stack overflow
     * @param cells Array of cells to calculate statistics from
     * @returns Object containing statistics
     */
    public static calculateStatsForLargeDataset(cells: Cell[]): {
        count: number;
        sum: number;
        min: number;
        max: number;
        average: number;
    } {
        // For very large datasets (e.g., 100,000+ rows), use this optimized method
        // Early exit for empty cells array
        if (cells.length === 0) {
            return {
                count: 0,
                sum: 0,
                min: 0,
                max: 0,
                average: 0,
            };
        }

        // Process in batches asynchronously
        const BATCH_SIZE = 5000;
        let count = 0;
        let sum = 0;
        let min = Number.POSITIVE_INFINITY;
        let max = Number.NEGATIVE_INFINITY;

        // Process cells in batches
        for (let i = 0; i < cells.length; i += BATCH_SIZE) {
            const end = Math.min(i + BATCH_SIZE, cells.length);

            // Process this batch
            for (let j = i; j < end; j++) {
                const value = cells[j].getNumericValue();
                if (value !== null) {
                    count++;
                    sum += value;

                    // Update min/max without using Math.min/max with spread operator
                    if (value < min) min = value;
                    if (value > max) max = value;
                }
            }
        }

        // Handle case when no numeric values found
        if (count === 0) {
            return {
                count: 0,
                sum: 0,
                min: 0,
                max: 0,
                average: 0,
            };
        }

        const average = sum / count;

        return {
            count,
            sum,
            min: isFinite(min) ? min : 0,
            max: isFinite(max) ? max : 0,
            average,
        };
    }

    /**
     * Calculates statistics asynchronously for extremely large datasets
     * This prevents UI blocking when processing massive selections
     * @param cells Array of cells to calculate statistics from
     * @returns Promise that resolves to statistics object
     */
    public static async calculateStatsAsync(cells: Cell[]): Promise<{
        count: number;
        sum: number;
        min: number;
        max: number;
        average: number;
    }> {
        return new Promise((resolve) => {
            // For UI responsiveness, defer execution to next event loop
            setTimeout(() => {
                // Use the appropriate method based on dataset size
                if (cells.length > this.LARGE_DATASET_THRESHOLD) {
                    resolve(this.calculateStatsForLargeDataset(cells));
                } else {
                    resolve(this.calculateStats(cells));
                }
            }, 0);
        });
    }

    /**
     * Smart stats calculator that chooses the appropriate method based on data size
     * For synchronous use when async isn't possible
     * @param cells Array of cells to calculate statistics from
     * @returns Statistics object
     */
    public static calculateStatsSmart(cells: Cell[]): {
        count: number;
        sum: number;
        min: number;
        max: number;
        average: number;
    } {
        // Choose the appropriate method based on dataset size
        if (cells.length > this.LARGE_DATASET_THRESHOLD) {
            return this.calculateStatsForLargeDataset(cells);
        } else {
            return this.calculateStats(cells);
        }
    }
}
