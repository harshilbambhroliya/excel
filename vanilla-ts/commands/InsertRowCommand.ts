import { Command } from './Command.js';
import { Grid } from '../core/Grid.js';

/**
 * Command for inserting a row at a specific position
 */
export class InsertRowCommand extends Command {
    /** @type {Grid} The grid where the row will be inserted */
    private grid: Grid;
    
    /** @type {number} The position where the row will be inserted */
    private position: number;
    
    /** @type {boolean} Whether the command has been executed */
    private executed: boolean = false;

    /**
     * Creates a new InsertRowCommand
     * @param {Grid} grid The grid where the row will be inserted
     * @param {number} position The position where the row will be inserted
     */
    constructor(grid: Grid, position: number) {
        super();
        this.grid = grid;
        this.position = position;
    }

    /**
     * Executes the command to insert a row
     */
    public execute(): void {
        if (!this.executed) {
            this.grid.insertRow(this.position);
            this.executed = true;
        }
    }

    /**
     * Undoes the command by removing the inserted row
     */
    public undo(): void {
        if (this.executed) {
            this.grid.removeRow(this.position);
            this.executed = false;
        }
    }
} 