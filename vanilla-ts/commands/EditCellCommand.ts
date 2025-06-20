// src/commands/EditCellCommand.ts
import { Command } from './Command.js';
import { Grid } from '../core/Grid.js';

export class EditCellCommand extends Command {
    private grid: Grid;
    private row: number;
    private col: number;
    private newValue: any;
    private oldValue: any;

    constructor(grid: Grid, row: number, col: number, newValue: any) {
        super();
        this.grid = grid;
        this.row = row;
        this.col = col;
        this.newValue = newValue;
        this.oldValue = grid.getCellValue(row, col);
    }

    public execute(): void {
        this.grid.setCellValue(this.row, this.col, this.newValue);
    }

    public undo(): void {
        this.grid.setCellValue(this.row, this.col, this.oldValue);
    }
}