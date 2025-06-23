// src/commands/Command.ts
import { ICommand } from '../types/interfaces.js';

/**
 * Abstract base class for all commands in the application
 * Implements the command pattern for undo/redo functionality
 */
export abstract class Command implements ICommand {
    /**
     * Executes the command
     */
    abstract execute(): void;
    
    /**
     * Undoes the command
     */
    abstract undo(): void;
}

/**
 * Manages command execution, undo, and redo functionality
 */
export class CommandManager {
    /** @type {Command[]} Stack of commands that can be undone */
    private undoStack: Command[] = [];
    
    /** @type {Command[]} Stack of commands that can be redone */
    private redoStack: Command[] = [];
    
    /** @type {number} Maximum number of commands to keep in history */
    private maxHistory: number = 100;

    /**
     * Executes a command and adds it to the undo stack
     * @param {Command} command The command to execute
     */
    public executeCommand(command: Command): void {
        command.execute();
        this.undoStack.push(command);
        this.redoStack = []; // Clear redo stack when new command is executed
        
        // Limit history size
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
    }

    /**
     * Undoes the most recent command
     * @returns {boolean} True if a command was undone, false otherwise
     */
    public undo(): boolean {
        const command = this.undoStack.pop();
        if (command) {
            command.undo();
            this.redoStack.push(command);
            return true;
        }
        return false;
    }

    /**
     * Redoes the most recently undone command
     * @returns {boolean} True if a command was redone, false otherwise
     */
    public redo(): boolean {
        const command = this.redoStack.pop();
        if (command) {
            command.execute();
            this.undoStack.push(command);
            return true;
        }
        return false;
    }

    /**
     * Checks if there are commands that can be undone
     * @returns {boolean} True if there are commands in the undo stack
     */
    public canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    /**
     * Checks if there are commands that can be redone
     * @returns {boolean} True if there are commands in the redo stack
     */
    public canRedo(): boolean {
        return this.redoStack.length > 0;
    }
}