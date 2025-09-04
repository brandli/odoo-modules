{
    'name': 'BPMN',
    'version': '18.0.1.1.0',
    'author': 'Gentian',
    'category': 'Productivity',
    'summary': 'BPMN diagram viewer and editor for Odoo',
    'description': """
BPMN Module
===========

View and manage BPMN diagrams within Odoo using BPMN.js.

Features:
- Interactive BPMN diagram viewer
- Real-time diagram updates
- Integrated with Odoo forms
- Zoom and navigation controls
- Element selection and details
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
