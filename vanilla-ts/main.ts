// src/main.ts
import { Grid } from "./core/Grid.js";
import { Renderer } from "./core/Renderer.js";
import { EventHandler } from "./core/EventHandler.js";
import { CommandManager } from "./commands/Command.js";
import { DataGenerator } from "./utils/DataGenerator.js";
import { ScrollbarManager } from "./core/ScrollbarManager.js";

/**
 * Main application class for Excel-like spreadsheet app
 */
class ExcelApp {
    /** @type {HTMLCanvasElement} Canvas element for rendering the spreadsheet */
    private canvas: HTMLCanvasElement;

    /** @type {Grid | null} The data grid managing spreadsheet content */
    private grid: Grid | null = null;

    /** @type {Renderer | null} Handles rendering of the grid to canvas */
    private renderer: Renderer | null = null;

    /** @type {EventHandler | null} Processes user interactions */
    private eventHandler: EventHandler | null = null;

    /** @type {CommandManager | null} Manages undo/redo operations */
    private commandManager: CommandManager | null = null;

    /** @type {ScrollbarManager | null} Manages scrolling functionality */
    private scrollbarManager: ScrollbarManager | null = null;

    /**
     * Initializes the Excel application
     */
    constructor() {
        this.canvas = document.getElementById(
            "excelCanvas"
        ) as HTMLCanvasElement;
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.canvas.clientWidth * dpr;
        this.canvas.height = this.canvas.clientHeight * dpr;
        this.canvas.style.width = this.canvas.clientWidth + "px";
        this.canvas.style.height = this.canvas.clientHeight + "px";
        this.canvas.getContext("2d")?.scale(dpr, dpr); // Important
        if (!this.canvas) {
            throw new Error("Canvas element not found");
        }

        this.initializeApp();
        this.setupUI();
    }

    /**
     * Initializes the core components of the application
     */
    private initializeApp(): void {
        this.grid = new Grid();
        this.commandManager = new CommandManager();
        this.renderer = new Renderer(this.canvas, this.grid);
        this.eventHandler = new EventHandler(
            this.canvas,
            this.grid,
            this.renderer,
            this.commandManager
        );

        // Set the event handler in renderer
        this.renderer.setEventHandler(this.eventHandler);
        this.handleDPRChange();

        const container = document.querySelector(
            ".excel-container"
        ) as HTMLElement;
        if (container) {
            this.scrollbarManager = new ScrollbarManager(
                container,
                (scrollX, scrollY) => {
                    this.renderer!.handleScroll(scrollX, scrollY);
                }
            );

            this.renderer.setScrollbarManager(this.scrollbarManager);
            this.eventHandler.setScrollbarManager(this.scrollbarManager);
        }

        // Setup resize observer for better resize handling
        this.setupResizeObserver();

        // Initialize zoom display
        this.updateZoomLevelDisplay();

        // Initial render
        this.renderer.render();

        this.setupDPRListener();
    }

    private handleDPRChange(): void {
        this.renderer!.updateDevicePixelRatio();
        // After updating device pixel ratio, also update the zoom display
        this.updateZoomLevelDisplay();
    }

    /**
     * Sets up the UI buttons and their event handlers
     */
    private setupUI(): void {
        const loadDataBtn = document.getElementById("loadData");
        const undoBtn = document.getElementById("undo");
        const redoBtn = document.getElementById("redo");
        const clearBtn = document.getElementById("clear");
        const calculationInput = document.getElementById("calculationInput");
        const zoomInBtn = document.getElementById("zoomIn");
        const zoomOutBtn = document.getElementById("zoomOut");
        const zoomResetBtn = document.getElementById("zoomReset");

        // Insert row and column buttons
        const insertRowAboveBtn = document.getElementById("insertRowAbove");
        const insertRowBelowBtn = document.getElementById("insertRowBelow");
        const insertColumnLeftBtn = document.getElementById("insertColumnLeft");
        const insertColumnRightBtn =
            document.getElementById("insertColumnRight");
        const boldBtn = document.getElementById("bold");
        const italicBtn = document.getElementById("italic");
        const underlineBtn = document.getElementById("underline");
        const strikethroughBtn = document.getElementById("strikethrough");
        if (loadDataBtn) {
            loadDataBtn.addEventListener("click", () => {
                this.loadSampleData();
            });
        }

        if (undoBtn) {
            undoBtn.addEventListener("click", () => {
                if (this.commandManager!.undo()) {
                    this.renderer!.render();
                }
            });
        }

        if (redoBtn) {
            redoBtn.addEventListener("click", () => {
                if (this.commandManager!.redo()) {
                    this.renderer!.render();
                }
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener("click", () => {
                this.grid!.clear();
                this.renderer!.render();
            });
        }

        if (calculationInput) {
            calculationInput.addEventListener("input", (e) => {
                const value = (e.target as HTMLInputElement).value;
                this.eventHandler!.handleCalculation(value);
            });
        }

        // Zoom controls
        if (zoomInBtn && this.renderer) {
            zoomInBtn.addEventListener("click", () => {
                this.renderer!.zoomIn();
                this.updateZoomLevelDisplay();
            });
        }

        if (zoomOutBtn && this.renderer) {
            zoomOutBtn.addEventListener("click", () => {
                this.renderer!.zoomOut();
                this.updateZoomLevelDisplay();
            });
        }

        if (zoomResetBtn && this.renderer) {
            zoomResetBtn.addEventListener("click", () => {
                this.renderer!.setZoom(1.0);
                this.updateZoomLevelDisplay();
            });
        }

        // Insert row and column handlers
        if (insertRowAboveBtn && this.eventHandler) {
            insertRowAboveBtn.addEventListener("click", () => {
                const selection = this.grid!.getSelection();
                if (selection.startRow >= 0) {
                    this.eventHandler!.insertRowAbove(selection.startRow);
                } else {
                    alert(
                        "Please select a cell first to insert a row above it."
                    );
                }
            });
        }

        if (insertRowBelowBtn && this.eventHandler) {
            insertRowBelowBtn.addEventListener("click", () => {
                let selection = this.grid!.getSelection();
                if (selection.startRow >= 0) {
                    this.eventHandler!.insertRowBelow(selection.startRow);
                } else {
                    alert(
                        "Please select a cell first to insert a row below it."
                    );
                }
            });
        }

        if (insertColumnLeftBtn && this.eventHandler) {
            insertColumnLeftBtn.addEventListener("click", () => {
                const selection = this.grid!.getSelection();
                if (selection.startCol >= 0) {
                    this.eventHandler!.insertColumnLeft(selection.startCol);
                } else {
                    alert(
                        "Please select a cell first to insert a column to the left of it."
                    );
                }
            });
        }

        if (insertColumnRightBtn && this.eventHandler) {
            insertColumnRightBtn.addEventListener("click", () => {
                const selection = this.grid!.getSelection();
                if (selection.startCol >= 0) {
                    this.eventHandler!.insertColumnRight(selection.startCol);
                } else {
                    alert(
                        "Please select a cell first to insert a column to the right of it."
                    );
                }
            });
        }

        if (boldBtn && this.eventHandler) {
            boldBtn.addEventListener("click", () => {
                boldBtn.classList.toggle("active");
                this.eventHandler!.toggleStyle("bold");
            });
        }

        if (italicBtn && this.eventHandler) {
            italicBtn.addEventListener("click", () => {
                italicBtn.classList.toggle("active");
                this.eventHandler!.toggleStyle("italic");
            });
        }

        if (underlineBtn && this.eventHandler) {
            underlineBtn.addEventListener("click", () => {
                underlineBtn.classList.toggle("active");
                this.eventHandler!.toggleStyle("underline");
            });
        }

        if (strikethroughBtn && this.eventHandler) {
            strikethroughBtn.addEventListener("click", () => {
                strikethroughBtn.classList.toggle("active");
                this.eventHandler!.toggleStyle("strikethrough");
            });
        }
    }

    /**
     * Updates the zoom level display
     */
    private updateZoomLevelDisplay(): void {
        // this.handleDPRChange();
        const zoomLevelSpan = document.getElementById("zoomLevel");
        if (zoomLevelSpan && this.renderer) {
            const zoomPercentage = Math.round(this.renderer.getZoom() * 100);
            zoomLevelSpan.textContent = `${zoomPercentage}%`;
        }
    }

    /**
     * Loads sample data into the grid for testing
     */
    private loadSampleData(): void {
        try {
            // Reasonable default for most systems
            const recordCount = 100000;

            console.log(`Generating ${recordCount} sample records...`);
            const startTime = performance.now();

            const data = DataGenerator.generateRecords(recordCount);
            console.log(`Generated ${data.length} records successfully`);

            // Load data into the grid
            this.grid!.loadData(data);
            console.log(
                `Data loaded into grid: ${this.grid!.getCurrentRows()} rows, ${this.grid!.getCurrentCols()} columns`
            );

            // Force the renderer to recalculate positions
            this.renderer!.recalculatePositions();

            // Update scrollbars to reflect the new data size
            this.renderer!.refreshScrollbars();

            // Render the grid with the new data
            this.renderer!.render();

            const endTime = performance.now();
            console.log(`Data loaded in ${(endTime - startTime).toFixed(2)}ms`);
        } catch (error) {
            console.error("Error loading sample data:", error);
        }
    }

    /**
     * Resizes the canvas to match its container dimensions
     */

    /**
     * Sets up a resize observer to handle window resize events
     */
    private setupResizeObserver(): void {
        if ("ResizeObserver" in window) {
            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    if (entry.target === this.canvas.parentElement) {
                        // Use requestAnimationFrame to avoid multiple resize events
                        requestAnimationFrame(() => {
                            this.renderer!.handleWindowResize();
                        });
                        break;
                    }
                }
            });

            if (this.canvas.parentElement) {
                resizeObserver.observe(this.canvas.parentElement);
            }
        } else {
            // Fallback for browsers without ResizeObserver
            (window as Window).addEventListener("resize", () => {
                // Use requestAnimationFrame to throttle resize events
                requestAnimationFrame(() => {
                    this.renderer!.handleWindowResize();
                });
            });
        }

        // Additional event listener for orientation changes on mobile
        window.addEventListener("orientationchange", () => {
            // Wait a bit for the orientation change to complete
            setTimeout(() => {
                this.renderer!.handleWindowResize();
            }, 200);
        });
    }

    private setupDPRListener(): void {
        let lastDPR = window.devicePixelRatio;
        setInterval(() => {
            if (window.devicePixelRatio !== lastDPR) {
                lastDPR = window.devicePixelRatio;
                this.handleDPRChange();
            }
        }, 300); // Check every 300ms
    }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    new ExcelApp();
});
