/**
 * Created by seth on 6/7/15.
 */

function uuid() {
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

define(function(require){
    require('jquery');
    var Reflux = require('reflux');

    var fetchVMListAction = Reflux.createAction();
    var VMListFetchedAction = Reflux.createAction();
    var VMFetchedAction = Reflux.createAction();

    var connectAction = Reflux.createAction();
    var connectedAction = Reflux.createAction();
    var disconnectedAction = Reflux.createAction();

    var fetchSnapshotsAction = Reflux.createAction();
    var snapshotsFetchedAction = Reflux.createAction();
    var currentSnapshotFetchedAction = Reflux.createAction();
    var revertToSnapshotAction = Reflux.createAction();

    var ConnectionStore = Reflux.createStore({
        init: function() {
            this.listenTo(connectAction, this.connectHandler);
            this.listenTo(connectedAction, this.connectedHandler);
            this.listenTo(disconnectedAction, this.disconnectedHandler);
        },
        connectHandler: function(vCenterConnectionInfo) {
            this.trigger({connected: false, connecting: true, vCenter: vCenterConnectionInfo.vCenter});
            var messageDict = {
                action: 'connect',
                parameters: vCenterConnectionInfo
            };
            wsInteract.send(JSON.stringify(messageDict));
        },
        connectedHandler: function(vCenter) {
            this.trigger({connected: true, connecting: false, vCenter: vCenter});
            fetchVMListAction();
        },
        disconnectedHandler: function() {
            this.trigger({connected: false, connecting: false, vCenter: null});
        }
    });

    var VMStateStore = Reflux.createStore({
        init: function() {
            this.vmState = {};
            this.listenTo(snapshotsFetchedAction, this.snapshotsFetched);
            this.listenTo(fetchSnapshotsAction, this.fetchSnapshots);
            this.listenTo(currentSnapshotFetchedAction, this.currentSnapshotFetched);
        },
        fetchSnapshots: function(vmId) {
            var messageDict = {
                action: 'fetch_snapshots',
                parameters: {
                    vm_id: vmId
                }
            };
            wsInteract.send(JSON.stringify(messageDict));
        },
        snapshotsFetched: function(vmSnapshots) {
            var vmId = vmSnapshots.vm_id;
            if (!(vmId in this.vmState))
                this.vmState[vmId] = {};
            this.vmState[vmId].snapshot_list = vmSnapshots.snapshot_list;
            this.trigger(this.vmState, vmId);
        },
        currentSnapshotFetched: function(snapshotName, vmId) {
            if (!(vmId in this.vmState))
                this.vmState[vmId] = {};
            this.vmState[vmId].currentSnapshotName = snapshotName;
            this.trigger(this.vmState, vmId);
        }
    });

    var VMListStore = Reflux.createStore({
        init: function() {
            this.listenTo(VMListFetchedAction, this.vmListUpdatedHandler);
            this.listenTo(fetchVMListAction, this.fetchVMListHandler);
            this.listenTo(revertToSnapshotAction, this.revertToSnapshotHandler);
            this.listenTo(VMFetchedAction, this.vmUpdatedHandler);
            this.vmList = [];
        },
        vmListUpdatedHandler: function(vmList) {
            this.vmList = vmList;
            this.trigger(this.vmList);
        },
        vmUpdatedHandler: function(updatedVm) {
            for (var i = 0; i < this.vmList.length; i++) {
                if (vm.id == updatedVm.id){
                    this.vmList[i] = updatedVm;
                    console.log('Updating VM ' + updatedVm.id);
                    this.trigger(this.vmList);
                    break;
                }
            }
        },
        fetchVMListHandler: function () {
            var messageDict = {
                'action': 'refresh_vm_list'
            };
            var messageJSON = JSON.stringify(messageDict);
            wsInteract.send(messageJSON);
        },
        revertToSnapshotHandler: function(vm_id, snapshot_id) {
            var messageDict = {
                action: 'revert_to_snapshot',
                parameters: {
                    vm_id: vm_id,
                    snapshot_id: snapshot_id
                }
            };
            wsInteract.send(JSON.stringify(messageDict))
        }
    });

    var wsInteract = new WebSocket('ws://' + window.location.host + '/interact.ws');
    wsInteract.onmessage = function(evt) {
        var data = JSON.parse(evt.data);
        switch(data.message) {
            case 'vm_list':
                VMListFetchedAction(data.parameters.vm_list);
                break;
            case 'connected':
                connectedAction(data.parameters.vCenter);
                break;
            case 'disconnected':
                disconnectedAction();
                break;
            case 'snapshot_list':
                snapshotsFetchedAction(data.parameters);
                break;
        }
    };
    wsInteract.onclose = function() {
        disconnectedAction();
    };

    return {
        actions: {
            fetchVMListAction: fetchVMListAction,
            VMListFetchedAction: VMListFetchedAction,
            connectedAction: connectedAction,
            connectAction: connectAction,
            disconnectedAction: disconnectedAction,
            fetchSnapshotsAction: fetchSnapshotsAction,
            snapshotsFetchedAction: snapshotsFetchedAction,
            revertToSnapshotAction: revertToSnapshotAction
        },
        stores: {
            VMListStore: VMListStore,
            ConnectionStore: ConnectionStore,
            VMStateStore: VMStateStore
        }
    }
});