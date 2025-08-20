from odoo import models, fields

class SimpleTask(models.Model):
    _name = 'simple.task'
    _description = 'Simple Task'

    name = fields.Char(string='Task Name', required=True)
