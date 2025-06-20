// src/main.ts
import { Grid } from './core/Grid.js';
import { Renderer } from './core/Renderer.js';
import { EventHandler } from './core/EventHandler.js';
import { CommandManager } from './commands/Command.js';
import { DataGenerator } from './utils/DataGenerator.js';
import { ScrollbarManager } from './core/ScrollbarManager.js';

class ExcelApp {
    private canvas: HTMLCanvasElement;
    private grid: Grid | null = null;
    private renderer: Renderer | null = null;
    private eventHandler: EventHandler | null = null;
    private commandManager: CommandManager | null = null;
    private scrollbarManager: ScrollbarManager | null = null;

    constructor() {
        this.canvas = document.getElementById('excelCanvas') as HTMLCanvasElement;
        if (!this.canvas) {
            throw new Error('Canvas element not found');
        }

        this.initializeApp();
        this.setupUI();
    }

    private initializeApp(): void {
        // Ensure canvas takes full container size
        this.resizeCanvas();
        
        this.grid = new Grid();
        this.commandManager = new CommandManager();
        this.renderer = new Renderer(this.canvas, this.grid);
        this.eventHandler = new EventHandler(this.canvas, this.grid, this.renderer, this.commandManager);
        
        // Set the event handler in renderer
        this.renderer.setEventHandler(this.eventHandler);

        const container = document.querySelector('.excel-container') as HTMLElement;
        if (container) {
            this.scrollbarManager = new ScrollbarManager(container, (scrollX, scrollY) => {
                this.renderer!.handleScroll(scrollX, scrollY);
            });
            
            this.renderer.setScrollbarManager(this.scrollbarManager);
            this.eventHandler.setScrollbarManager(this.scrollbarManager);
        }
        
        // Setup resize observer for better resize handling
        this.setupResizeObserver();
        
        // Initial render
        this.renderer.render();
    }

    private setupUI(): void {
        const loadDataBtn = document.getElementById('loadData');
        const undoBtn = document.getElementById('undo');
        const redoBtn = document.getElementById('redo');
        const clearBtn = document.getElementById('clear');

        if (loadDataBtn) {
            loadDataBtn.addEventListener('click', () => {
                this.loadSampleData();
            });
        }

        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                if (this.commandManager!.undo()) {
                    this.renderer!.render();
                }
            });
        }

        if (redoBtn) {
            redoBtn.addEventListener('click', () => {
                if (this.commandManager!.redo()) {
                    this.renderer!.render();
                }
            });
        }
        
        if(clearBtn){
            clearBtn.addEventListener('click', () => {
                this.grid!.clear();
                this.renderer!.render();
            });
        }
    }

    private loadSampleData(): void {
        console.log('Generating 50,000 sample records...');
        const startTime = performance.now();
        
        const data = DataGenerator.generateRecords(1048576);
        this.grid!.loadData(data);
        this.renderer!.render();
        
        const endTime = performance.now();
        console.log(`Data loaded in ${(endTime - startTime).toFixed(2)}ms`);
    }

    private resizeCanvas(): void {
        const container = this.canvas.parentElement;
        if (!container) return;
        
        // Force container to take full available space
        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }
    
    private setupResizeObserver(): void {
        if ('ResizeObserver' in window) {
            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    if (entry.target === this.canvas.parentElement) {
                        this.renderer!.handleWindowResize();
                        break;
                    }
                }
            });
            
            if (this.canvas.parentElement) {
                resizeObserver.observe(this.canvas.parentElement);
            }
        } else {
            // Fallback for browsers without ResizeObserver
            (window as any).addEventListener('resize', () => {
                setTimeout(() => {
                    this.renderer!.handleWindowResize();
                }, 100);
            });
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ExcelApp();
});