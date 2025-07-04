// src/types/interfaces.ts
export interface ICell {
    value: any;
    type: "string" | "number" | "boolean" | "date";
    formula?: string;
    style?: ICellStyle;
}

export interface ICellStyle {
    backgroundColor?: string;
    textColor?: string;
    fontSize?: number;
    fontWeight?: string;
    textAlign?: "left" | "center" | "right";
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
    id: number;
    firstName: string;
    lastName: string;
    age: number;
    salary: number;
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

export interface ICellStyle {
    fontWeight?: string;
    backgroundColor?: string;
    textColor?: string;
    fontSize?: number;
    textAlign?: "left" | "center" | "right";
    border?: string;
    fontStyle?: "normal" | "italic";
    textDecoration?: "none" | "underline" | "line-through";
    textDecorationLine?: "none" | "underline" | "line-through";
}
