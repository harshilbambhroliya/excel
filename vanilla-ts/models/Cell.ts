// src/models/Cell.ts
import { ICell, ICellStyle } from '../types/interfaces.js';

export class Cell implements ICell {
    public value: any;
    public type: 'string' | 'number' | 'boolean' | 'date';
    public formula?: string;
    public style: ICellStyle;

    constructor(value: any = '', type: 'string' | 'number' | 'boolean' | 'date' = 'string') {
        this.value = value;
        this.type = type;
        this.style = {
            backgroundColor: '#ffffff',
            textColor: '#000000',
            fontSize: 14,
            fontWeight: 'normal',
            textAlign: 'left'
        };
        
        this.inferType();
    }

    private inferType(): void {
        if (typeof this.value === 'number') {
            this.type = 'number';
        } else if (typeof this.value === 'boolean') {
            this.type = 'boolean';
        } else if (this.value instanceof Date) {
            this.type = 'date';
        } else {
            this.type = 'string';
        }
    }

    public setValue(value: any): void {
        this.value = value;
        this.inferType();
    }

    public getDisplayValue(): string {
        if (this.value === null || this.value === undefined) {
            return '';
        }
        
        if (this.type === 'number') {
            return this.value.toLocaleString();
        }
        
        return String(this.value);
    }

    public getNumericValue(): number | null {
        if (this.type === 'number') {
            return this.value;
        }
        
        const parsed = parseFloat(String(this.value));
        return isNaN(parsed) ? null : parsed;
    }
}