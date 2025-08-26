/** @odoo-module **/

// Debug: Log immediately when file starts loading
console.log('🔴 BPMN Auto-Mounter: File starting to load...');
console.log('🔴 BPMN Auto-Mounter: This should appear if the file loads at all');

// Test if this file even executes
window.BPMN_AUTO_MOUNT_LOADED = true;
console.log('🔴 BPMN Auto-Mounter: Set global flag, window.BPMN_AUTO_MOUNT_LOADED =', window.BPMN_AUTO_MOUNT_LOADED);

// Let's try a very basic approach first - no imports yet
console.log('🔴 BPMN Auto-Mounter: About to create basic auto-mounter...');

/**
 * Very basic auto-mounter for testing
 */
class BasicBPMNAutoMounter {
    constructor() {
        console.log('🔴 BPMN Auto-Mounter: BasicBPMNAutoMounter constructor called');
        this.mounted = false;
    }
    
    init() {
        console.log('🔴 BPMN Auto-Mounter: init() called');
        // Just try to find the mount point for now
        this.findMountPoint();
        
        // Set up a simple retry mechanism
        setInterval(() => {
            if (!this.mounted) {
                this.findMountPoint();
            }
        }, 2000);
    }
    
    findMountPoint() {
        const mountPoint = document.getElementById('bpmn-owl-mount-point');
        console.log('🔴 BPMN Auto-Mounter: Looking for mount point...', {
            found: !!mountPoint,
            mounted: this.mounted
        });
        
        if (mountPoint && !this.mounted) {
            console.log('🔴 BPMN Auto-Mounter: Found mount point! Element:', mountPoint);
            // For now, just add some test content
            mountPoint.innerHTML = '<div style="padding: 20px; border: 2px solid red; background: #ffe6e6;"><strong>🔴 AUTO-MOUNTER WORKING!</strong><br>Mount point found and auto-mounter is functional.</div>';
            this.mounted = true;
        }
    }
}

// Initialize the basic auto-mounter
console.log('🔴 BPMN Auto-Mounter: Creating BasicBPMNAutoMounter instance...');
const basicAutoMounter = new BasicBPMNAutoMounter();
basicAutoMounter.init();

console.log('🔴 BPMN Auto-Mounter: Basic auto-mounter initialized!');
