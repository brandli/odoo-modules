# -*- coding: utf-8 -*-

from odoo import models, fields, api


class BPMNProcessVersion(models.Model):
    _name = 'bpmn.process.version'
    _description = 'BPMN Process Version History'
    _order = 'created_date desc, version_number desc'
    _rec_name = 'display_name'

    process_id = fields.Many2one(
        'bpmn.process',
        string='BPMN Process',
        required=True,
        ondelete='cascade',
        help="Reference to the main BPMN process"
    )
    
    version_number = fields.Integer(
        string='Version Number',
        required=True,
        help="Version number of this snapshot"
    )
    
    bpmn_xml_snapshot = fields.Text(
        string='BPMN XML Snapshot',
        required=True,
        help="BPMN XML content at this version"
    )
    
    description = fields.Text(
        string='Description',
        help="Description of changes in this version"
    )
    
    change_type = fields.Selection([
        ('create', 'Created'),
        ('update', 'Updated'),
        ('restore', 'Restored'),
        ('auto_save', 'Auto-saved')
    ], string='Change Type', required=True, default='update')
    
    created_by = fields.Many2one(
        'res.users',
        string='Created By',
        required=True,
        default=lambda self: self.env.user,
        help="User who created this version"
    )
    
    created_date = fields.Datetime(
        string='Created Date',
        required=True,
        default=fields.Datetime.now,
        help="When this version was created"
    )
    
    file_size = fields.Integer(
        string='File Size (bytes)',
        compute='_compute_file_size',
        store=True,
        help="Size of the BPMN XML content in bytes"
    )
    
    display_name = fields.Char(
        string='Display Name',
        compute='_compute_display_name',
        store=True
    )
    
    @api.depends('bpmn_xml_snapshot')
    def _compute_file_size(self):
        """Compute the file size of the BPMN XML content"""
        for record in self:
            if record.bpmn_xml_snapshot:
                record.file_size = len(record.bpmn_xml_snapshot.encode('utf-8'))
            else:
                record.file_size = 0
    
    @api.depends('process_id.name', 'version_number', 'created_date')
    def _compute_display_name(self):
        """Compute display name for version history entries"""
        for record in self:
            process_name = record.process_id.name or 'Unknown Process'
            version = record.version_number or 0
            date_str = record.created_date.strftime('%Y-%m-%d %H:%M') if record.created_date else 'Unknown Date'
            record.display_name = f"{process_name} v{version} ({date_str})"
    
    def action_restore_version(self):
        """Restore the BPMN process to this version"""
        self.ensure_one()
        
        if not self.bpmn_xml_snapshot:
            raise ValueError("Cannot restore: no XML snapshot available")
        
        # Update the main process with this version's content
        self.process_id.write({
            'bpmn_xml': self.bpmn_xml_snapshot,
            'version': self.process_id.version + 1,  # Increment version
            'last_modified_by': self.env.user.id
        })
        
        # Create a new version entry for the restore action
        self.process_id._create_version_entry(
            f'Restored from version {self.version_number}',
            'restore'
        )
        
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': 'Version Restored',
                'message': f'Process restored to version {self.version_number}',
                'type': 'success'
            }
        }
    
    def action_compare_with_current(self):
        """Compare this version with the current version"""
        self.ensure_one()
        
        current_xml = self.process_id.bpmn_xml or ''
        version_xml = self.bpmn_xml_snapshot or ''
        
        # Simple comparison - in a real implementation, you might want a more sophisticated diff
        if current_xml == version_xml:
            message = "This version is identical to the current version"
        else:
            current_size = len(current_xml)
            version_size = len(version_xml)
            size_diff = abs(current_size - version_size)
            message = f"Differences found: {size_diff} character(s) difference in size"
        
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': 'Version Comparison',
                'message': message,
                'type': 'info'
            }
        }
