// src/commands/ResizeRowCommand.ts
import { Command } from './Command.js';
import { Grid } from '../core/Grid.js';

export class ResizeRowCommand extends Command {
    private grid: Grid;
    private rowIndex: number;
    private newHeight: number;
    private oldHeight: number;

    constructor(grid: Grid, rowIndex: number, newHeight: number) {
        super();
        this.grid = grid;
        this.rowIndex = rowIndex;
        this.newHeight = newHeight;
        this.oldHeight = grid.getRowHeight(rowIndex);
    }

    public execute(): void {
        this.grid.setRowHeight(this.rowIndex, this.newHeight);
    }

    public undo(): void {
        this.grid.setRowHeight(this.rowIndex, this.oldHeight);
    }
}