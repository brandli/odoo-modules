# BPMN Viewer Module for Odoo

A basic BPMN diagram viewing module that integrates BPMN.js with Odoo using OWL components.

## Features

- View BPMN diagrams in Odoo form views
- Store BPMN XML definitions in text fields
- Basic BPMN.js integration with error handling
- Demo data with sample processes
- Responsive diagram viewer with zoom-to-fit functionality

## Installation

### Method 1: Using Docker (Recommended)

1. Build the Docker image:
```bash
cd /path/to/odoo-modules
docker build -t odoo-bpmn .
```

2. Run the container:
```bash
docker run -d --name odoo-bpmn -p 8069:8069 odoo-bpmn
```

### Method 2: Manual Installation

1. Copy the module to your Odoo addons path
2. Download BPMN.js library manually:
```bash
cd bpmn/static/lib/bpmn-js/dist/
curl -L -o bpmn-viewer.development.js https://unpkg.com/bpmn-js@17.7.1/dist/bpmn-viewer.development.js
curl -L -o bpmn-js.css https://unpkg.com/bpmn-js@17.7.1/dist/assets/bpmn-js.css
```

3. Restart Odoo and install the module

## Testing the Module

### 1. Install the Module

1. Go to Apps menu in Odoo
2. Remove the "Apps" filter to see all modules
3. Search for "BPMN Viewer"
4. Click Install

### 2. Access BPMN Processes

1. Navigate to the new "BPMN" menu in the main menu bar
2. Click on "Processes"
3. You should see demo processes if demo data was installed

### 3. View BPMN Diagrams

1. Open any process record
2. The "BPMN Diagram" tab should display the visual diagram
3. The "XML Source" tab shows the raw BPMN XML
4. Try creating a new process - it will get a default template

### 4. Test the Widget

1. Create a new process
2. Paste valid BPMN XML in the XML Source tab
3. Switch to the BPMN Diagram tab to see the visual representation
4. Test with invalid XML to see error handling

## Troubleshooting

### Common Issues

1. **BPMN.js not loading**: Check browser console for JavaScript errors
2. **Module not visible**: Ensure it's properly installed and Odoo was restarted
3. **Diagram not showing**: Check that BPMN.js files are properly downloaded

### Browser Console Debugging

Open browser developer tools (F12) and check:
- Network tab: Ensure BPMN.js files are loading (200 status)
- Console tab: Look for JavaScript errors
- Sources tab: Verify that bpmn-viewer.development.js is loaded

### Expected Behavior

- **Valid BPMN XML**: Displays interactive diagram with pan/zoom
- **Invalid XML**: Shows error message with warning icon
- **Empty field**: Shows placeholder with "No BPMN diagram to display"
- **Diagram interaction**: Should support mouse pan, zoom, and element selection

## File Structure

```
bpmn/
├── __init__.py
├── __manifest__.py
├── data/
│   └── demo_data.xml           # Demo processes
├── models/
│   ├── __init__.py
│   └── bpmn_process.py         # Main model
├── security/
│   └── ir.model.access.csv     # Access rights
├── static/
│   ├── lib/
│   │   └── bpmn-js/
│   │       └── dist/           # BPMN.js library files
│   └── src/
│       ├── components/
│       │   ├── bpmn_viewer.js  # OWL component
│       │   └── bpmn_viewer.xml # Component template
│       └── fields/
│           └── bpmn_widget.js  # Form field widget
└── views/
    └── bpmn_process_views.xml  # UI views
```

## Next Steps

This is a basic viewer implementation. Possible enhancements:

1. **Editing capabilities**: Switch from Viewer to Modeler
2. **Property panels**: Add BPMN element property editing
3. **Custom styling**: Apply Odoo-specific themes
4. **Advanced integration**: Connect to Odoo workflows
5. **Import/Export**: Add file upload/download features

## Technical Notes

- Uses BPMN.js 17.7.1 (viewer only)
- Compatible with Odoo 17.0+
- Follows OWL component patterns
- Container-based integration strategy
- Unidirectional data flow (BPMN → OWL → Odoo)
