{
    'name': 'BPMN Viewer',
    'version': '18.0.1.1.0',
    'category': 'Productivity',
    'summary': 'BPMN.js integration for Odoo - Database-first viewer implementation',
    'description': """
BPMN Viewer Module - Database-First Approach
============================================

This module provides database-first BPMN diagram viewing capabilities within Odoo using BPMN.js.
Features:
- Database-first: BPMN diagrams load directly from database fields
- Automatic synchronization between database and viewer
- Real-time updates when navigating between records
- Store BPMN XML definitions in PostgreSQL database
- Enhanced error handling and connection status monitoring
- Memory-optimized BPMN.js integration with OWL components

This implementation ensures that the BPMN viewer always reflects the current database state
and provides a reliable, scalable foundation for BPMN workflow management.
    """,
    'depends': ['base', 'web'],
    'data': [
        'security/ir.model.access.csv',
        'views/bpmn_process_views.xml',
        'data/demo_data.xml',
    ],
    'assets': {
        'web.assets_backend': [
            # BPMN.js core library and styles
            'bpmn/static/lib/bpmn-js/dist/bpmn-viewer.development.js',
            'bpmn/static/lib/bpmn-js/dist/bpmn-js.css',
            
            # BPMN OWL Component (production implementation)
            'bpmn/static/src/js/bpmn_component.js',
            'bpmn/static/src/js/bpmn_mount.js',
        ],
    },
    'installable': True,
    'application': True,
    'auto_install': False,
    'license': 'LGPL-3',
}
