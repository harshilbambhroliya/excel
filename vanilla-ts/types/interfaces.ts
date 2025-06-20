// src/types/interfaces.ts
export interface ICell {
    value: any;
    type: 'string' | 'number' | 'boolean' | 'date';
    formula?: string;
    style?: ICellStyle;
}

export interface ICellStyle {
    backgroundColor?: string;
    textColor?: string;
    fontSize?: number;
    fontWeight?: string;
    textAlign?: 'left' | 'center' | 'right';
}

export interface IPosition {
    row: number;
    col: number;
}

export interface IRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface IDataRecord {
    id: string;
    firstName: string;
    lastName: string;
    age: string;
    salary: string;
}

export interface ICommand {
    execute(): void;
    undo(): void;
}

export interface ISelection {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
}

export interface IGridDimensions {
    rowHeight: number;
    columnWidth: number;
    headerHeight: number;
    headerWidth: number;
}