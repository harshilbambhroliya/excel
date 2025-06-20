// src/utils/MathUtils.ts
import { Cell } from '../models/Cell.js';

export class MathUtils {
    public static calculateStats(cells: Cell[]): {
        count: number;
        sum: number;
        min: number;
        max: number;
        average: number;
    } {
        const numericValues = cells
            .map(cell => cell.getNumericValue())
            .filter(value => value !== null) as number[];

        if (numericValues.length === 0) {
            return {
                count: 0,
                sum: 0,
                min: 0,
                max: 0,
                average: 0
            };
        }

        const sum = numericValues.reduce((acc, val) => acc + val, 0);
        const min = Math.min(...numericValues);
        const max = Math.max(...numericValues);
        const average = sum / numericValues.length;

        return {
            count: numericValues.length,
            sum,
            min,
            max,
            average
        };
    }
}