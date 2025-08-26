{
    'name': 'BPMN Viewer',
    'version': '18.0.1.0.0',
    'category': 'Productivity',
    'summary': 'BPMN.js integration for Odoo - Basic viewer implementation',
    'description': """
BPMN Viewer Module
==================

This module provides basic BPMN diagram viewing capabilities within Odoo using BPMN.js.
Features:
- View BPMN diagrams in form views
- Store BPMN XML definitions
- Basic BPMN.js integration with OWL components

This is a foundational implementation that can be extended with editing capabilities.
    """,
    'depends': ['base', 'web'],
    'data': [
        'security/ir.model.access.csv',
        'views/bpmn_process_views.xml',
        'data/demo_data.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'bpmn/static/lib/bpmn-js/dist/bpmn-viewer.development.js',
            'bpmn/static/lib/bpmn-js/dist/bpmn-js.css',
            'bpmn/static/src/js/bpmn_loader.js',
            'bpmn/static/src/js/bpmn_viewer_component.js',
            'bpmn/static/src/js/bpmn_viewer_widget.js',
            # 'bpmn/static/src/js/bpmn_auto_mount.js',  # Temporarily disabled
            'bpmn/static/src/xml/bpmn_loader_template.xml',
            'bpmn/static/src/xml/bpmn_viewer_template.xml',
            'bpmn/static/src/xml/bpmn_page_template.xml',
        ],
    },
    'installable': True,
    'application': True,
    'auto_install': False,
    'license': 'LGPL-3',
}
