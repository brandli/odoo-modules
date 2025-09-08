{
    'name': 'BPMN',
    'version': '18.0.1.1.0',
    'author': 'Gentian',
    'category': 'Productivity',
    'summary': 'BPMN diagram editor for Odoo',
    'description': """
BPMN Process Diagrams
=====================

Interactive BPMN 2.0 diagram editor integrated with Odoo forms.

• View and edit BPMN process diagrams with full editing capabilities
• Drag-and-drop element creation and modification
• Edit BPMN XML with syntax highlighting
• Powered by BPMN.js modeler library
    """,
    'depends': ['base', 'web'],
    'data': [
        'security/ir.model.access.csv',
        'views/bpmn_process_views.xml',
        'data/demo_data.xml',
    ],
    'assets': {
        'web.assets_backend': [
            # BPMN.js modeler library and styles (via CDN for Phase 1.1)
            'https://unpkg.com/bpmn-js@17.7.1/dist/bpmn-modeler.development.js',
            'https://unpkg.com/bpmn-js@17.7.1/dist/assets/bpmn-js.css',
            
            # BPMN.js properties panel for editing (Phase 1.1)
            'https://unpkg.com/bpmn-js-properties-panel@5.6.0/dist/bpmn-js-properties-panel.js',
            'https://unpkg.com/bpmn-js-properties-panel@5.6.0/dist/assets/properties-panel.css',
            
            # BPMN OWL Component (enhanced for editing)
            'bpmn/static/src/js/bpmn_component.js',
            'bpmn/static/src/js/bpmn_mount.js',
        ],
    },
    'installable': True,
    'application': True,
    'auto_install': False,
    'license': 'LGPL-3',
}
