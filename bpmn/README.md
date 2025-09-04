# BPMN Module

A simple Odoo module for viewing BPMN diagrams using BPMN.js.

## Features

- **View BPMN Diagrams**: Render BPMN 2.0 XML as interactive diagrams
- **Simple Interface**: Edit XML and load diagrams with one click
- **Demo Data**: Includes sample BPMN processes for testing
- **Clean Integration**: Uses BPMN.js library for professional diagram rendering

## Installation

1. Copy the `bpmn` folder to your Odoo addons directory
2. Restart Odoo server
3. Go to Apps and install "BPMN"

## Usage

1. Navigate to **BPMN > Processes**
2. Create a new process or edit an existing one
3. Go to the **BPMN Diagram** tab
4. Edit the XML source or use the provided sample
5. Click **Load Diagram** to render the visualization

## Technical Details

- **BPMN.js Version**: 17.7.1
- **Odoo Version**: 18.0+
- **Dependencies**: base, web
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
