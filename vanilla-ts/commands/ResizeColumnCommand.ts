// src/commands/ResizeColumnCommand.ts
import { Command } from './Command.js';
import { Grid } from '../core/Grid.js';

export class ResizeColumnCommand extends Command {
    private grid: Grid;
    private colIndex: number;
    private newWidth: number;
    private oldWidth: number;

    constructor(grid: Grid, colIndex: number, newWidth: number) {
        super();
        this.grid = grid;
        this.colIndex = colIndex;
        this.newWidth = newWidth;
        this.oldWidth = grid.getColumnWidth(colIndex);
    }

    public execute(): void {
        this.grid.setColumnWidth(this.colIndex, this.newWidth);
    }

    public undo(): void {
        this.grid.setColumnWidth(this.colIndex, this.oldWidth);
    }
}