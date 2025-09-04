# BPMN Module

Interactive BPMN diagram viewer and editor for Odoo using BPMN.js.

## Features

- **Interactive BPMN Viewer**: Render BPMN 2.0 XML as interactive diagrams
- **Zoom & Navigation**: Full zoom and pan controls for large diagrams  
- **Element Selection**: Click elements to view details and properties
- **Real-time Updates**: Edit XML and reload to see changes instantly
- **Modern UI**: Clean, card-based interface with Bootstrap styling
- **Professional Integration**: Uses BPMN.js library for standards-compliant rendering

## Installation

1. Copy the `bpmn` folder to your Odoo addons directory
2. Restart Odoo server
3. Go to Apps and install "BPMN"

## Usage

1. Navigate to **BPMN > Processes**
2. Create a new process or edit an existing one
3. Go to the **BPMN Diagram** tab
4. Edit the XML source or create a default diagram
5. Use the **Reload** button to update the visualization
6. Use zoom, pan, and selection controls to navigate the diagram

## Technical Details

- **BPMN.js Version**: 17.7.1
- **Odoo Version**: 18.0+
- **Dependencies**: base, web
- **Architecture**: OWL Components with modern ES6+ JavaScript
- **License**: LGPL-3

## Files Structure

```
bpmn/
├── __init__.py                 # Module initialization
├── __manifest__.py             # Module manifest
├── models/
│   ├── __init__.py
│   └── bpmn_process.py        # BPMN process model
├── views/
│   └── bpmn_process_views.xml # Form and list views
├── data/
│   └── demo_data.xml          # Sample BPMN processes
├── security/
│   └── ir.model.access.csv    # Access rights
├── static/
│   ├── lib/bpmn-js/          # BPMN.js library files
│   └── src/js/
│       └── bpmn_loader.js     # Diagram loading logic
└── README.md                  # This file
```

## Development

This is a minimal, clean implementation focused on BPMN diagram viewing. It can be extended with:

- BPMN editing capabilities
- Process execution features
- Advanced BPMN elements support
- Integration with workflow systems
