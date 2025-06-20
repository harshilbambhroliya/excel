// src/models/Row.ts
export class Row {
    public height: number;
    public index: number;
    public isSelected: boolean = false;

    constructor(index: number, height: number = 25) {
        this.index = index;
        this.height = height;
    }

    public setHeight(height: number): void {
        this.height = Math.max(15, height); // Minimum height
    }

    public select(): void {
        this.isSelected = true;
    }

    public deselect(): void {
        this.isSelected = false;
    }
}