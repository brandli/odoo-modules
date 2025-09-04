{
    'name': 'BPMN',
    'version': '18.0.1.1.0',
    'author': 'Gentian',
    'category': 'Productivity',
    'summary': 'BPMN diagram viewer for Odoo',
    'description': """
BPMN Process Diagrams
=====================

Interactive BPMN 2.0 diagram viewer integrated with Odoo forms.

• View and edit BPMN process diagrams
• Edit BPMN XML with syntax highlighting
• Powered by BPMN.js library
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
