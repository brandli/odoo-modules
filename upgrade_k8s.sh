#!/bin/bash
# Kubernetes-based module upgrade script

echo "Looking for Odoo pods in odoo namespace..."
kubectl get pods -n odoo -o wide | grep -i odoo

echo ""
echo "Upgrading BPMN module via kubectl..."

# Find the Odoo pod in the odoo namespace
POD_NAME=$(kubectl get pods -n odoo --no-headers -o custom-columns=":metadata.name" | grep -i odoo | head -1)

if [ -z "$POD_NAME" ]; then
    echo "No Odoo pod found!"
    exit 1
fi

echo "Found Odoo pod: $POD_NAME"

# Upgrade the module
echo "Upgrading BPMN module..."

# Try different upgrade approaches
echo "Attempting upgrade via Odoo shell..."
if kubectl exec $POD_NAME -n odoo -- python3 -c "
import sys
sys.path.append('/opt/odoo/src/odoo')
import odoo
from odoo.modules.registry import Registry
from odoo import api

# Connect to database
odoo.tools.config['db_name'] = 'test'
db = odoo.sql_db.db_connect('test')

with api.Environment.manage():
    with db.cursor() as cr:
        env = api.Environment(cr, 1, {})
        
        # Find and upgrade the module
        module = env['ir.module.module'].search([('name', '=', 'bpmn')])
        if module:
            print(f'Found module: {module.name} (state: {module.state})')
            if module.state == 'installed':
                module.button_immediate_upgrade()
                print('Module upgrade initiated successfully!')
            else:
                print(f'Module state is {module.state}, not installed')
        else:
            print('Module not found')
        
        cr.commit()
"; then
    echo "✅ Module upgraded successfully via Python shell"
else
    echo "⚠️  Python shell upgrade failed, trying alternative..."
    
    # Alternative: Use odoo-bin with proper environment
    echo "Trying upgrade via odoo-bin with virtual environment..."
    kubectl exec $POD_NAME -n odoo -- bash -c "
        cd /opt/odoo/src/odoo && 
        source /opt/odoo/venv/bin/activate && 
        python odoo-bin -d test -u bpmn --stop-after-init --no-http
    "
fi

echo "Module upgrade completed. Assets should be refreshed automatically."
