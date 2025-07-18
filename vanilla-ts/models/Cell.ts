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

        // Initialize with basic styles
        this.style = {
            backgroundColor: "#ffffff",
            textColor: "#000000",
            fontSize: 14,
            fontWeight: "normal",
            textAlign: "left", // Default alignment
        };

        // Let inferType set the correct type and alignment based on the value
        this.inferType();

        // Log initialization for debugging
        if (typeof this.value === "number" || this.type === "number") {
            console.log(
                `Created numeric cell with value ${this.value}, type ${this.type}, alignment ${this.style.textAlign}`
            );
        }
    }

    /**
     * Infers the data type of the cell value
     */
    private inferType(): void {
        if (typeof this.value === "number") {
            this.type = "number";
            // Always right-align numbers
            this.style.textAlign = "right";
        } else if (typeof this.value === "boolean") {
            this.type = "boolean";
        } else if (this.value instanceof Date) {
            this.type = "date";
        } else if (typeof this.value === "string") {
            // Check for currency and percentage strings
            const currencyRegex = /^[$€£¥]\d+\.?\d*$/;
            const percentRegex = /^\d+\.?\d*%$/;
            const numberWithCommasRegex = /^-?[\d,]+\.?\d*$/;

            if (
                currencyRegex.test(this.value) ||
                percentRegex.test(this.value) ||
                numberWithCommasRegex.test(this.value)
            ) {
                // Mark as "string" but handle specially with style.textAlign = "right"
                this.type = "string";
                this.style.textAlign = "right";
            } else {
                this.type = "string";
            }
        } else {
            this.type = "string";
        }
    }
    /**
     * Sets a new value for the cell
     * @param {any} value The new value to set
     * @param {string} formula Optional formula that generated this value
     */
    public setValue(value: any, formula?: string): void {
        this.value = value;
        this.formula = formula;

        // Let inferType determine the appropriate type and alignment
        this.inferType();
    }

    /**
     * Sets the formula for this cell
     * @param {string} formula The formula string
     */
    public setFormula(formula: string): void {
        this.formula = formula;
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
     * Gets the edit value (what should be shown in the editor)
     * Returns the formula if it exists, otherwise the display value
     * @returns {string} The value to show in the editor
     */
    public getEditValue(): string {
        if (this.formula) {
            return this.formula;
        }
        return this.getDisplayValue();
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
