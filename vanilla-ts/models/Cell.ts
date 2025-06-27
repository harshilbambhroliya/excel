// src/models/Cell.ts
import { ICell, ICellStyle } from "../types/interfaces.js";

/**
 * Represents a cell in the spreadsheet grid
 */
export class Cell implements ICell {
    /** @type {any} The value stored in the cell */
    public value: any;

    /** @type {'string' | 'number' | 'boolean' | 'date'} The data type of the cell value */
    public type: "string" | "number" | "boolean" | "date";

    /** @type {string} The formula used to calculate the cell value, if any */
    public formula?: string;

    /** @type {ICellStyle} The styling information for the cell */
    public style: ICellStyle;

    /**
     * Initializes a new Cell instance
     * @param {any} value The initial value of the cell
     * @param {'string' | 'number' | 'boolean' | 'date'} type The initial data type of the cell
     */
    constructor(
        value: any = "",
        type: "string" | "number" | "boolean" | "date" = "string"
    ) {
        this.value = value;
        this.type = type;
        this.style = {
            backgroundColor: "#ffffff",
            textColor: "#000000",
            fontSize: 14,
            fontWeight: "normal",
            textAlign: "left",
        };

        this.inferType();
    }

    /**
     * Infers the data type of the cell value
     */
    private inferType(): void {
        if (typeof this.value === "number") {
            this.type = "number";
        } else if (typeof this.value === "boolean") {
            this.type = "boolean";
        } else if (this.value instanceof Date) {
            this.type = "date";
        } else {
            this.type = "string";
        }
    }

    /**
     * Sets a new value for the cell
     * @param {any} value The new value to set
     */
    public setValue(value: any): void {
        this.value = value;
        this.inferType();
    }

    /**
     * Gets the display representation of the cell value
     * @returns {string} The formatted display value
     */
    public getDisplayValue(): string {
        if (this.value === null || this.value === undefined) {
            return "";
        }

        if (this.type === "number") {
            return this.value.toLocaleString();
        }

        return String(this.value);
    }

    /**
     * Gets the numeric value of the cell, if possible
     * @returns {number | null} The numeric value or null if not a number
     */
    public getNumericValue(): number | null {
        if (this.type === "number") {
            return this.value;
        }

        const parsed = parseFloat(String(this.value));
        return isNaN(parsed) ? null : parsed;
    }

    public getStyle(): ICellStyle {
        return this.style;
    }

    public setStyle(style: ICellStyle): void {
        this.style = { ...this.style, ...style };
        console.log(`Cell style updated: ${JSON.stringify(this.style)}`);
    }
}
