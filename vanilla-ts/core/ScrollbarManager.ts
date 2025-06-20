// src/core/ScrollbarManager.ts
export class ScrollbarManager {
    private container: HTMLElement;
    private horizontalScrollbar: HTMLElement;
    private verticalScrollbar: HTMLElement;
    private horizontalThumb: HTMLElement;
    private verticalThumb: HTMLElement;
    private onScrollCallback: (scrollX: number, scrollY: number) => void;
    
    private maxScrollX: number = 0;
    private maxScrollY: number = 0;
    private currentScrollX: number = 0;
    private currentScrollY: number = 0;
    private viewportWidth: number = 0;
    private viewportHeight: number = 0;
    private contentWidth: number = 0;
    private contentHeight: number = 0;
    
    private isDraggingHorizontal: boolean = false;
    private isDraggingVertical: boolean = false;
    private dragStartX: number = 0;
    private dragStartY: number = 0;
    private dragStartScrollX: number = 0;
    private dragStartScrollY: number = 0;

    constructor(container: HTMLElement, onScroll: (scrollX: number, scrollY: number) => void) {
        this.container = container;
        this.onScrollCallback = onScroll;
        
        this.horizontalScrollbar = container.querySelector('.horizontal-scrollbar') as HTMLElement;
        this.verticalScrollbar = container.querySelector('.vertical-scrollbar') as HTMLElement;
        this.horizontalThumb = container.querySelector('.horizontal-thumb') as HTMLElement;
        this.verticalThumb = container.querySelector('.vertical-thumb') as HTMLElement;
        
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Horizontal scrollbar events
        this.horizontalThumb.addEventListener('mousedown', this.handleHorizontalMouseDown.bind(this));
        this.horizontalScrollbar.addEventListener('click', this.handleHorizontalTrackClick.bind(this));
        
        // Vertical scrollbar events
        this.verticalThumb.addEventListener('mousedown', this.handleVerticalMouseDown.bind(this));
        this.verticalScrollbar.addEventListener('click', this.handleVerticalTrackClick.bind(this));
        
        // Global mouse events for dragging
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Prevent text selection during drag
        this.horizontalThumb.addEventListener('selectstart', (e) => e.preventDefault());
        this.verticalThumb.addEventListener('selectstart', (e) => e.preventDefault());
    }

    private handleHorizontalMouseDown(event: MouseEvent): void {
        event.preventDefault();
        this.isDraggingHorizontal = true;
        this.dragStartX = event.clientX;
        this.dragStartScrollX = this.currentScrollX;
        document.body.style.userSelect = 'none';
    }

    private handleVerticalMouseDown(event: MouseEvent): void {
        event.preventDefault();
        this.isDraggingVertical = true;
        this.dragStartY = event.clientY;
        this.dragStartScrollY = this.currentScrollY;
        document.body.style.userSelect = 'none';
    }

    private handleMouseMove(event: MouseEvent): void {
        if (this.isDraggingHorizontal) {
            const deltaX = event.clientX - this.dragStartX;
            const trackWidth = this.horizontalScrollbar.clientWidth;
            const thumbWidth = this.horizontalThumb.clientWidth;
            const scrollableWidth = trackWidth - thumbWidth;
            
            if (scrollableWidth > 0) {
                const scrollRatio = deltaX / scrollableWidth;
                const newScrollX = Math.max(0, Math.min(this.maxScrollX, 
                    this.dragStartScrollX + (scrollRatio * this.maxScrollX)));
                this.setScrollX(newScrollX);
            }
        }
        
        if (this.isDraggingVertical) {
            const deltaY = event.clientY - this.dragStartY;
            const trackHeight = this.verticalScrollbar.clientHeight;
            const thumbHeight = this.verticalThumb.clientHeight;
            const scrollableHeight = trackHeight - thumbHeight;
            
            if (scrollableHeight > 0) {
                const scrollRatio = deltaY / scrollableHeight;
                const newScrollY = Math.max(0, Math.min(this.maxScrollY, 
                    this.dragStartScrollY + (scrollRatio * this.maxScrollY)));
                this.setScrollY(newScrollY);
            }
        }
    }

    private handleMouseUp(): void {
        this.isDraggingHorizontal = false;
        this.isDraggingVertical = false;
        document.body.style.userSelect = '';
    }

    private handleHorizontalTrackClick(event: MouseEvent): void {
        if (event.target === this.horizontalThumb) return;
        
        const rect = this.horizontalScrollbar.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const thumbWidth = this.horizontalThumb.clientWidth;
        const trackWidth = this.horizontalScrollbar.clientWidth;
        
        const scrollRatio = (clickX - thumbWidth / 2) / (trackWidth - thumbWidth);
        const newScrollX = Math.max(0, Math.min(this.maxScrollX, scrollRatio * this.maxScrollX));
        this.setScrollX(newScrollX);
    }

    private handleVerticalTrackClick(event: MouseEvent): void {
        if (event.target === this.verticalThumb) return;
        
        const rect = this.verticalScrollbar.getBoundingClientRect();
        const clickY = event.clientY - rect.top;
        const thumbHeight = this.verticalThumb.clientHeight;
        const trackHeight = this.verticalScrollbar.clientHeight;
        
        const scrollRatio = (clickY - thumbHeight / 2) / (trackHeight - thumbHeight);
        const newScrollY = Math.max(0, Math.min(this.maxScrollY, scrollRatio * this.maxScrollY));
        this.setScrollY(newScrollY);
    }

    public updateScrollbars(viewportWidth: number, viewportHeight: number, contentWidth: number, contentHeight: number): void {
        this.viewportWidth = viewportWidth;
        this.viewportHeight = viewportHeight;
        this.contentWidth = contentWidth;
        this.contentHeight = contentHeight;
        
        this.maxScrollX = Math.max(0, contentWidth - viewportWidth);
        this.maxScrollY = Math.max(0, contentHeight - viewportHeight);
        
        this.updateHorizontalScrollbar();
        this.updateVerticalScrollbar();
    }

    private updateHorizontalScrollbar(): void {
        const needsScrollbar = this.maxScrollX > 0;
        this.horizontalScrollbar.style.display = needsScrollbar ? 'block' : 'none';
        
        if (needsScrollbar) {
            const trackWidth = this.horizontalScrollbar.clientWidth;
            const thumbWidth = Math.max(20, (this.viewportWidth / this.contentWidth) * trackWidth);
            const scrollableWidth = trackWidth - thumbWidth;
            
            this.horizontalThumb.style.width = thumbWidth + 'px';
            
            if (this.maxScrollX > 0) {
                const thumbPosition = (this.currentScrollX / this.maxScrollX) * scrollableWidth;
                this.horizontalThumb.style.left = thumbPosition + 'px';
            } else {
                this.horizontalThumb.style.left = '0px';
            }
        }
    }

    private updateVerticalScrollbar(): void {
        const needsScrollbar = this.maxScrollY > 0;
        this.verticalScrollbar.style.display = needsScrollbar ? 'block' : 'none';
        
        if (needsScrollbar) {
            const trackHeight = this.verticalScrollbar.clientHeight;
            const thumbHeight = Math.max(20, (this.viewportHeight / this.contentHeight) * trackHeight);
            const scrollableHeight = trackHeight - thumbHeight;
            
            this.verticalThumb.style.height = thumbHeight + 'px';
            
            if (this.maxScrollY > 0) {
                const thumbPosition = (this.currentScrollY / this.maxScrollY) * scrollableHeight;
                this.verticalThumb.style.top = thumbPosition + 'px';
            } else {
                this.verticalThumb.style.top = '0px';
            }
        }
    }

    public setScrollX(scrollX: number): void {
        this.currentScrollX = Math.max(0, Math.min(this.maxScrollX, scrollX));
        this.updateHorizontalScrollbar();
        this.onScrollCallback(this.currentScrollX, this.currentScrollY);
    }

    public setScrollY(scrollY: number): void {
        this.currentScrollY = Math.max(0, Math.min(this.maxScrollY, scrollY));
        this.updateVerticalScrollbar();
        this.onScrollCallback(this.currentScrollX, this.currentScrollY);
    }

    public setScroll(scrollX: number, scrollY: number): void {
        this.currentScrollX = Math.max(0, Math.min(this.maxScrollX, scrollX));
        this.currentScrollY = Math.max(0, Math.min(this.maxScrollY, scrollY));
        this.updateHorizontalScrollbar();
        this.updateVerticalScrollbar();
        this.onScrollCallback(this.currentScrollX, this.currentScrollY);
    }

    public getScrollPosition(): { x: number; y: number } {
        return { x: this.currentScrollX, y: this.currentScrollY };
    }

    public scrollBy(deltaX: number, deltaY: number): void {
        this.setScroll(this.currentScrollX + deltaX, this.currentScrollY + deltaY);
    }
}