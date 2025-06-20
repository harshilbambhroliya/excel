// src/commands/Command.ts
import { ICommand } from '../types/interfaces.js';

export abstract class Command implements ICommand {
    abstract execute(): void;
    abstract undo(): void;
}

export class CommandManager {
    private undoStack: Command[] = [];
    private redoStack: Command[] = [];
    private maxHistory: number = 100;

    public executeCommand(command: Command): void {
        command.execute();
        this.undoStack.push(command);
        this.redoStack = []; // Clear redo stack when new command is executed
        
        // Limit history size
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
    }

    public undo(): boolean {
        const command = this.undoStack.pop();
        if (command) {
            command.undo();
            this.redoStack.push(command);
            return true;
        }
        return false;
    }

    public redo(): boolean {
        const command = this.redoStack.pop();
        if (command) {
            command.execute();
            this.undoStack.push(command);
            return true;
        }
        return false;
    }

    public canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    public canRedo(): boolean {
        return this.redoStack.length > 0;
    }
}