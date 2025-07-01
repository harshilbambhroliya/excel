# Excel - Vanilla TypeScript

A feature-rich Excel-like spreadsheet web application built with vanilla TypeScript and HTML Canvas. This project implements a functional spreadsheet with many Excel-like features without using any UI frameworks.

## Features

-   **Canvas-Based Rendering**: Efficient rendering of large spreadsheets using HTML Canvas
-   **Excel-like UI**: Familiar interface with rows, columns, and cell editing
-   **Rich Text Formatting**: Support for bold, italic, underline, strikethrough
-   **Cell Operations**: Edit, insert, delete rows/columns
-   **Undo/Redo**: Command pattern implementation for operation history
-   **Data Loading**: Generate and load sample data
-   **Scrolling**: Smooth scrollbar management for large datasets
-   **Formula Support**: Basic formula capabilities

## Getting Started

### Prerequisites

-   Node.js (version 16.x or higher recommended)
-   npm or yarn

### Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
# or
yarn
```

3. Start the development server:

```bash
npm run dev
# or
yarn dev
```

4. Open your browser and navigate to the URL displayed in the terminal (typically http://localhost:5173)

## Project Structure

```
excel/vanilla-ts/
├── commands/           # Command pattern implementations
├── core/               # Core functionality
├── models/             # Data models
├── public/             # Static assets
├── types/              # TypeScript interfaces and types
├── utils/              # Utility functions and helpers
├── index.html          # Main HTML entry point
├── main.ts             # Main application entry point
├── style.css           # Global styles
└── tsconfig.json       # TypeScript configuration
```

## Key Components

-   **Grid**: Manages the data model for the spreadsheet
-   **Renderer**: Handles drawing the spreadsheet UI on canvas
-   **EventHandler**: Processes user interactions like mouse and keyboard events
-   **CommandManager**: Implements undo/redo functionality
-   **ScrollbarManager**: Handles scrolling through large datasets

## Building for Production

To build the application for production:

```bash
npm run build
# or
yarn build
```

The built files will be in the `dist` directory.

## Technologies Used

-   TypeScript
-   HTML Canvas
-   Vite (for building and development)
-   CSS (for styling)

## Future Improvements

-   Dynamic column and row rendering based on data
-   SAAS model implementation
-   Enhanced formula support
-   Additional formatting options
-   Import/export functionality for Excel files

## License

This project is for demonstration and training purposes.
