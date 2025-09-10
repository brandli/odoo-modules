# BPMN Process Diagrams Module

Interactive BPMN 2.0 diagram editor integrated with Odoo forms, featuring enterprise-grade version control and collaborative editing capabilities.

## Features

### 🎨 **BPMN Diagram Editor**
- View and edit BPMN process diagrams with full editing capabilities
- Drag-and-drop element creation and modification
- Edit BPMN XML with syntax highlighting
- Powered by BPMN.js modeler library

### 📋 **Version Control System** (Phase 1.2)
- **Automatic Versioning**: Every change creates a new version automatically
- **Manual Snapshots**: Create version snapshots on-demand via form button
- **Version History**: Complete audit trail of all process changes
- **Version Restore**: Restore any previous version with one click
- **Change Tracking**: Track who made changes and when
- **Auto-save**: Background saving with conflict detection
- **Collaborative Editing**: Detect and prevent concurrent editing conflicts

### 🔒 **Security & Access Control**
- Role-based access control for processes and version history
- User and manager permission levels
- Secure API endpoints for auto-save functionality

## Installation

1. Copy the `bpmn` module to your Odoo addons directory
2. Update the apps list in Odoo
3. Install the "BPMN" module
4. The module will create the necessary menu items and views

## Usage

### Creating a BPMN Process

1. Navigate to **BPMN > Processes**
2. Click **Create** to add a new process
3. Enter a process name and description
4. Use the **BPMN Diagram** tab to edit your process visually
5. Use the **BPMN XML Source Code** section for direct XML editing

### Version Management

#### Automatic Versioning
- Versions are created automatically when you save changes to the BPMN XML
- Each version includes a snapshot of the complete BPMN definition
- Change types are tracked (Created, Updated, Manual Snapshot, Restored, Auto-saved)

#### Manual Version Snapshots
- Click the **"Create Milestone"** button in the form header
- Useful for marking stable versions or before major changes
- Milestone snapshots are clearly highlighted in the version history

#### Version History
- View all versions in the **Version History** tab of any process
- See version number, description, change type, author, and timestamp
- Compare versions to see differences
- Restore any previous version instantly
- Visual indicators distinguish between auto-saves, milestones, and other types

#### Auto-save Feature
- Processes automatically save in the background (if enabled)
- Conflict detection prevents data loss in collaborative environments
- Configure auto-save per process via the "Auto-save Enabled" field
- Status indicator shows when auto-save is active

### Version Restore Process

1. Go to the **Version History** tab of a process
2. Find the version you want to restore
3. Click the **"Restore"** button
4. Confirm the restoration
5. A new version will be created with the restored content

### Improved Save Workflow

The module now provides a streamlined save system:

- **Standard Save**: Regular Odoo save (no automatic versioning)
- **Auto-save**: Background automatic versioning when enabled
- **Create Milestone**: Manual creation of significant version markers

This eliminates confusion between multiple save options while maintaining all version control functionality.

## API Endpoints

The module provides several HTTP endpoints for integration:

### `/bpmn/auto_save`
- **Method**: POST (JSON)
- **Purpose**: Auto-save BPMN content with conflict detection
- **Parameters**: `process_id`, `xml_content`
- **Returns**: Success status, version info, and any conflict warnings

### `/bpmn/get_process_data`
- **Method**: POST (JSON)
- **Purpose**: Retrieve process data for JavaScript components
- **Parameters**: `process_id`
- **Returns**: Process data including XML content and metadata

### `/bpmn/validate_xml`
- **Method**: POST (JSON)
- **Purpose**: Validate BPMN XML format
- **Parameters**: `xml_content`
- **Returns**: Validation result and any errors

## Technical Architecture

### Models

#### `bpmn.process`
Main process model with enhanced versioning capabilities:
- `version`: Current version number
- `version_history_ids`: Relationship to version history
- `last_modified_by`: User tracking
- `auto_save_enabled`: Auto-save configuration
- `last_auto_save`: Auto-save timestamp

#### `bpmn.process.version`
Version history model for tracking all changes:
- `version_number`: Version sequence number
- `bpmn_xml_snapshot`: Complete XML snapshot
- `change_type`: Type of change (create/update/manual/restore/auto_save)
- `description`: Change description
- `created_by`: User who created the version
- `file_size`: Computed size of XML content

### Security

Access rights are configured for different user roles:
- **Users**: Read/write access to processes and versions
- **Managers**: Full access including version deletion
- **Public**: No access (authentication required)

## Development Status

### ✅ Phase 1.1 - Basic BPMN Editor
- BPMN.js integration
- Process CRUD operations
- XML editing capabilities

### ✅ Phase 1.2 - Version Control System
- Complete version tracking system
- Auto-save with conflict detection
- Version restore functionality
- HTTP API endpoints
- Enhanced security model

### 🔄 Phase 1.3 - Frontend Enhancements (Optional)
- Real-time collaboration features
- Advanced diff visualization  
- Enhanced JavaScript integration
- WebSocket support for live updates

**Note**: Phase 1.3 is optional and only needed for advanced real-time collaboration scenarios. The current implementation is production-ready for most use cases.

## File Structure

```
bpmn/
├── __init__.py                           # Module initialization
├── __manifest__.py                       # Module manifest
├── controllers/
│   ├── __init__.py                      # Controller initialization
│   └── bpmn_controller.py               # HTTP endpoints
├── models/
│   ├── __init__.py                      # Model initialization
│   ├── bpmn_process.py                  # Main process model
│   └── bpmn_process_version.py          # Version history model
├── security/
│   ├── ir.model.access.csv              # Basic access rights
│   └── bpmn_security.xml                # Extended security rules
├── static/
│   ├── lib/bpmn-js/                     # BPMN.js library files
│   └── src/                             # Custom JavaScript and CSS
└── views/
    ├── bpmn_process_views.xml           # Process form and list views
    └── bpmn_process_version_views.xml   # Version history views
```

## Dependencies

- **Odoo 18.0+**
- **Python 3.8+**
- **BPMN.js library** (included)

## License

This module is licensed under LGPL-3.

## Support

For issues, feature requests, or contributions, please contact the development team or create an issue in the project repository.
