// src/models/Column.ts
export class Column {
    public width: number;
    public index: number;
    public isSelected: boolean = false;
    public header: string;

    constructor(index: number, width: number = 100) {
        this.index = index;
        this.width = width;
        this.header = this.generateColumnHeader(index);
    }

    private generateColumnHeader(index: number): string {
        let result = '';
        let temp = index;
        
        do {
            result = String.fromCharCode(65 + (temp % 26)) + result;
            temp = Math.floor(temp / 26) - 1;
        } while (temp >= 0);
        
        return result;
    }

    public setWidth(width: number): void {
        this.width = Math.max(50, width); // Minimum width
    }

    public select(): void {
        this.isSelected = true;
    }

    public deselect(): void {
        this.isSelected = false;
    }
}