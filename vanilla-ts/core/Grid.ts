// src/core/Grid.ts
import { Row } from '../models/Row.js';
import { Column } from '../models/Column.js';
import { Selection } from '../models/Selection.js';
import { DataManager } from './DataManager.js';
import { IGridDimensions } from '../types/interfaces.js';

export class Grid {
    private rows: Row[] = [];
    private columns: Column[] = [];
    private dataManager: DataManager;
    private selection: Selection;
    private dimensions: IGridDimensions;

    constructor() {
        this.dataManager = new DataManager();
        this.selection = new Selection();
        this.dimensions = {
            rowHeight: 25,
            columnWidth: 100,
            headerHeight: 30,
            headerWidth: 60
        };

        this.initializeRowsAndColumns();
    }

    private initializeRowsAndColumns(): void {
        // Initialize rows
        for (let i = 0; i < this.dataManager.getMaxRows(); i++) {
            this.rows.push(new Row(i, this.dimensions.rowHeight));
        }

        // Initialize columns
        for (let i = 0; i < this.dataManager.getMaxCols(); i++) {
            this.columns.push(new Column(i, this.dimensions.columnWidth));
        }
    }

    public getCell(row: number, col: number) {
        return this.dataManager.getCell(row, col);
    }

    public getCellValue(row: number, col: number): any {
        return this.getCell(row, col).value;
    }

    public setCellValue(row: number, col: number, value: any): void {
        this.dataManager.setCell(row, col, value);
    }

    public getRow(index: number): Row {
        return this.rows[index];
    }

    public getColumn(index: number): Column {
        return this.columns[index];
    }

    public getSelection(): Selection {
        return this.selection;
    }

    public clear(): void {
        this.dataManager.clear();
    }

    public setRowHeight(rowIndex: number, height: number): void {
        if (rowIndex >= 0 && rowIndex < this.rows.length) {
            const oldHeight = this.rows[rowIndex].height;
            const newHeight = Math.max(15, height); // Ensure minimum height
            this.rows[rowIndex].setHeight(newHeight);
            
            // Log for debugging
            console.log(`Row ${rowIndex} height changed from ${oldHeight} to ${newHeight}`);
        }
    }

    public setColumnWidth(colIndex: number, width: number): void {
        if (colIndex >= 0 && colIndex < this.columns.length) {
            const oldWidth = this.columns[colIndex].width;
            const newWidth = Math.max(50, width); // Ensure minimum width
            this.columns[colIndex].setWidth(newWidth);
            
            // Log for debugging
            console.log(`Column ${colIndex} width changed from ${oldWidth} to ${newWidth}`);
        }
    }

    public getRowHeight(rowIndex: number): number {
        if (rowIndex < 0 || rowIndex >= this.rows.length) {
            return this.dimensions.rowHeight;
        }
        return this.rows[rowIndex].height;
    }

    public getColumnWidth(colIndex: number): number {
        if (colIndex < 0 || colIndex >= this.columns.length) {
            return this.dimensions.columnWidth;
        }
        return this.columns[colIndex].width;
    }

    public selectRow(rowIndex: number): void {
        this.clearAllSelections();
        if (rowIndex >= 0 && rowIndex < this.rows.length) {
            this.rows[rowIndex].select();
            this.selection.start(rowIndex, 0);
            this.selection.extend(rowIndex, this.dataManager.getMaxCols() - 1);
        }
    }

    public selectColumn(colIndex: number): void {
        this.clearAllSelections();
        if (colIndex >= 0 && colIndex < this.columns.length) {
            this.columns[colIndex].select();
            this.selection.start(0, colIndex);
            this.selection.extend(this.dataManager.getMaxRows() - 1, colIndex);
        }
    }

    

    public clearAllSelections(): void {
        this.rows.forEach(row => row.deselect());
        this.columns.forEach(col => col.deselect());
        this.selection.clear();
    }

    public loadData(data: any[]): void {
        this.dataManager.loadData(data);
    }

    public getDimensions(): IGridDimensions {
        return this.dimensions;
    }

    public getMaxRows(): number {
        return this.dataManager.getMaxRows();
    }

    public getMaxCols(): number {
        return this.dataManager.getMaxCols();
    }

    public getCellsInSelection(): any[] {
        if (!this.selection.isActive) return [];
        
        return this.dataManager.getCellsInRange(
            this.selection.startRow,
            this.selection.startCol,
            this.selection.endRow,
            this.selection.endCol
        );
    }
}